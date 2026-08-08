// ============================================================================
// Doodle Dash — Game Server (mini-service, port 3003)
// ----------------------------------------------------------------------------
// Implements the EXACT socket protocol defined in
//   /home/z/my-project/src/lib/game/types.ts
// (ClientToServerEvents / ServerToClientEvents).
//
// Imports shared types + helpers via relative paths (this is a standalone bun
// project; we cannot use the @/ alias here).
// ============================================================================

import { createServer } from 'http'
import { Server, type Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Player,
  Room,
  GameSettings,
  GameStage,
  Stroke,
  ShapeStroke,
  ChatMessage,
  GalleryItem,
  Reaction,
  ReactionEmoji,
  BrushType,
  WordDifficulty,
} from '../../src/lib/game/types'
import {
  DEFAULT_SETTINGS,
  generateRoomCode,
  makeWordHint,
  isCloseGuess,
} from '../../src/lib/game/types'
import { pickWords } from '../../src/lib/game/words'

// ----------------------------------------------------------------------------
// Server-only room state (extends the public Room with private/runtime fields)
// ----------------------------------------------------------------------------

interface ServerRoom {
  code: string
  hostId: string
  name: string // custom room name set by host
  players: Player[]
  settings: GameSettings
  stage: GameStage
  currentRound: number
  totalRounds: number
  currentDrawerId: string | null
  wordHint: string
  timeLeft: number
  paused: boolean // true when insufficient players mid-round
  chat: ChatMessage[]
  gallery: GalleryItem[]

  // --- server-only (never sent wholesale to clients) ---
  canvas: { strokes: Stroke[]; shapes: ShapeStroke[] }
  drawOrder: string[] // player ids in draw order
  currentDrawIndex: number
  wordChoices: string[] // 3 choices offered to current drawer
  currentWord: string | null // the actual word (kept private; only drawer sees it)
  hintRevealedCount: number // how many letters revealed so far (for incremental hints)
  usedWords: Set<string> // words already used this game (no repeats)

  // timers
  chooseTimeout: ReturnType<typeof setTimeout> | null
  drawInterval: ReturnType<typeof setInterval> | null
  drawEndTimeout: ReturnType<typeof setTimeout> | null
  hintTimeouts: ReturnType<typeof setTimeout>[]
  roundEndTimeout: ReturnType<typeof setTimeout> | null
}

interface PlayerLookup {
  socketId: string
  roomId: string
  player: Player
}

// ----------------------------------------------------------------------------
// In-memory state (no DB)
// ----------------------------------------------------------------------------

const rooms = new Map<string, ServerRoom>()
const players = new Map<string, PlayerLookup>() // socketId -> lookup
const roomWords = new Map<string, string>() // roomCode -> current word (mirror of ServerRoom.currentWord, kept separate per task spec)
// Per-room "recently seen" scores for players who fully disconnected after
// the grace window expired. Lets us restore their score if they rejoin later
// (e.g. after a long page-refresh / tab-close). TTL = 5 minutes.
const recentScores = new Map<string, Map<string, { score: number; ts: number; avatar: string; color: string }>>()
const RECENT_SCORE_TTL_MS = 5 * 60 * 1000

// Rate limiting maps (module-level so they persist across reconnects)
const chatRateLimit = new Map<string, number>() // socketId → last send timestamp
const typingRateLimit = new Map<string, number>() // socketId → last typing emit timestamp

const MAX_PLAYERS = 12
const CHOOSE_TIME_MS = 25_000
const ROUND_END_DELAY_MS = 3_000 // brief word reveal, then instant advance

// Special names that get a queen's welcome (case-insensitive).
const ROYAL_NAMES = ['sia', 'siya', 'maahi']

function isRoyalName(name: string): boolean {
  const n = name.trim().toLowerCase()
  return ROYAL_NAMES.includes(n)
}

/** Trigger confetti + queen welcome for special-named players. */
function announceQueen(io: Server, roomCode: string, name: string, avatar: string) {
  io.to(roomCode).emit('game:queen-arrival', { name, avatar })
  // Also send a special chat message
  const msg: ChatMessage = {
    id: rid(),
    playerId: 'system',
    name: 'System',
    content: `👑 All hail ${name}! The royalty has arrived. Bow down, peasants! 👑`,
    type: 'system',
    timestamp: now(),
  }
  io.to(roomCode).emit('chat:message', { message: msg })
  console.log(`[room] ${roomCode} 👑 QUEEN ARRIVAL: ${name}`)
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const rid = () => Math.random().toString(36).slice(2, 11)
const now = () => Date.now()

/** Levenshtein distance between two strings (for word-leak detection). */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Build the public Room payload sent to clients. currentWord is ALWAYS null
 *  here — the drawer receives the real word via `game:your-word`. */
function publicRoom(room: ServerRoom): Room {
  return {
    code: room.code,
    name: room.name,
    hostId: room.hostId,
    players: room.players.map((p) => ({ ...p })),
    settings: { ...room.settings },
    stage: room.stage,
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    currentDrawerId: room.currentDrawerId,
    currentWord: null, // never leak to non-drawers (drawer gets it via game:your-word)
    wordHint: room.wordHint,
    timeLeft: room.timeLeft,
    paused: room.paused || false,
    chat: room.chat.slice(-200),
    gallery: room.gallery.slice(),
  }
}

function emitRoomState(io: Server, room: ServerRoom) {
  io.to(room.code).emit('room:state', { room: publicRoom(room) })
}

function emitRoomStateToSocket(socket: Socket, room: ServerRoom) {
  socket.emit('room:state', { room: publicRoom(room) })
}

function clearTimers(room: ServerRoom) {
  if (room.chooseTimeout) {
    clearTimeout(room.chooseTimeout)
    room.chooseTimeout = null
  }
  if (room.drawInterval) {
    clearInterval(room.drawInterval)
    room.drawInterval = null
  }
  if (room.drawEndTimeout) {
    clearTimeout(room.drawEndTimeout)
    room.drawEndTimeout = null
  }
  for (const t of room.hintTimeouts) clearTimeout(t)
  room.hintTimeouts = []
  if (room.roundEndTimeout) {
    clearTimeout(room.roundEndTimeout)
    room.roundEndTimeout = null
  }
}

function deleteRoom(io: Server, code: string) {
  const room = rooms.get(code)
  if (!room) return
  clearTimers(room)
  // Make all sockets leave the room (defensive)
  io.in(code).socketsLeave(code)
  // Drop streak entries for all players in this room.
  rooms.delete(code)
  roomWords.delete(code)
  clearRecentScores(code)
  // Clean players map for any leftover sockets pointing here
  for (const [sid, lookup] of players) {
    if (lookup.roomId === code) players.delete(sid)
  }
  console.log(`[room] deleted ${code} (empty)`)
}

// ----------------------------------------------------------------------------
// Round / game flow
// ----------------------------------------------------------------------------

/** Check if a room has sufficient players for active play (1 drawer + ≥1 guesser). */
function hasSufficientPlayers(room: ServerRoom): boolean {
  const connected = room.players.filter((p) => p.connected && !p.isSpectator)
  if (connected.length < 2) return false
  // Drawer must be connected
  if (room.currentDrawerId) {
    const drawer = room.players.find((p) => p.id === room.currentDrawerId)
    if (!drawer || !drawer.connected || drawer.isSpectator) return false
  }
  // At least 1 non-drawer connected guesser
  const guessers = connected.filter((p) => p.id !== room.currentDrawerId)
  return guessers.length >= 1
}

/** Pause the round when insufficient players (drawer left or no guessers). */
function maybePause(io: Server, room: ServerRoom) {
  if (room.stage !== 'drawing' && room.stage !== 'choosing') return
  if (room.paused) return // already paused
  if (!hasSufficientPlayers(room)) {
    room.paused = true
    // Clear ALL active timers (draw-end, choose, draw-interval) — they'll be
    // re-scheduled on resume. Without this, chooseTimeout can fire while
    // paused, auto-picking a word and starting a broken round.
    if (room.drawEndTimeout) { clearTimeout(room.drawEndTimeout); room.drawEndTimeout = null }
    if (room.chooseTimeout) { clearTimeout(room.chooseTimeout); room.chooseTimeout = null }
    if (room.drawInterval) { clearInterval(room.drawInterval); room.drawInterval = null }
    console.log(`[game] room ${room.code} PAUSED — insufficient players`)
    // Notify spectators that a player is needed
    const spectators = room.players.filter((p) => p.isSpectator && p.connected)
    if (spectators.length > 0) {
      const needed = room.currentDrawerId && !room.players.find((p) => p.id === room.currentDrawerId && p.connected)
        ? 'drawer'
        : 'guesser'
      for (const sp of spectators) {
        io.to(sp.id).emit('room:promote-request', { needed })
      }
    }
    broadcastChat(io, room, {
      id: rid(), playerId: 'system', name: 'System',
      content: '⏸ Paused — waiting for players. Spectators can jump in!',
      type: 'system', timestamp: now(),
    })
    emitRoomState(io, room)
  }
}

/** Resume the round when players are sufficient again. */
function maybeResume(io: Server, room: ServerRoom) {
  if (!room.paused) return
  if (!hasSufficientPlayers(room)) return // still insufficient
  room.paused = false
  console.log(`[game] room ${room.code} RESUMED`)
  // Re-schedule the draw-end timeout with remaining time
  if (room.stage === 'drawing' && room.timeLeft > 0) {
    if (room.drawEndTimeout) clearTimeout(room.drawEndTimeout)
    room.drawEndTimeout = setTimeout(() => {
      try {
        if (room.stage === 'drawing') endRound(io, room)
      } catch (e) {
        console.error('[game] drawEnd error', e)
      }
    }, room.timeLeft * 1000)
  }
  broadcastChat(io, room, {
    id: rid(), playerId: 'system', name: 'System',
    content: '▶ Resumed — back to drawing!', type: 'system', timestamp: now(),
  })
  emitRoomState(io, room)
}

function startRound(io: Server, room: ServerRoom) {
  clearTimers(room)

  // drawOrder = connected NON-spectator players only.
  const connectedIds = new Set(
    room.players.filter((p) => p.connected && !p.isSpectator).map((p) => p.id)
  )
  room.drawOrder = room.drawOrder.filter((id) => connectedIds.has(id))

  // Advance index past any missing drawers (safety)
  while (
    room.currentDrawIndex < room.drawOrder.length &&
    !connectedIds.has(room.drawOrder[room.currentDrawIndex])
  ) {
    room.currentDrawIndex++
  }

  if (room.drawOrder.length === 0 || room.currentDrawIndex >= room.drawOrder.length) {
    // No drawers available — end the game
    endGame(io, room)
    return
  }

  room.currentDrawerId = room.drawOrder[room.currentDrawIndex]
  for (const p of room.players) p.guessedThisRound = false
  room.currentWord = null
  roomWords.set(room.code, '')
  room.wordHint = ''
  room.canvas = { strokes: [], shapes: [] }
  room.hintRevealedCount = 0
  room.stage = 'choosing'

  // Pick 3 word choices for the drawer
  const difficulty: WordDifficulty = room.settings.difficulty
  room.wordChoices = pickWords(difficulty, 4, room.usedWords)

  console.log(
    `[game] room ${room.code} round ${room.currentRound}: drawer=${room.currentDrawerId} choices=${room.wordChoices.join('|')}`
  )

  io.to(room.code).emit('game:round-start', {
    round: room.currentRound,
    drawerId: room.currentDrawerId,
    drawTime: room.settings.drawTime,
  })

  // Send the 3 choices ONLY to the drawer
  io.to(room.currentDrawerId).emit('game:your-turn', {
    wordChoices: room.wordChoices,
  })

  emitRoomState(io, room)

  // Auto-pick a random choice after CHOOSE_TIME_MS
  room.chooseTimeout = setTimeout(() => {
    try {
      if (room.stage !== 'choosing' || !room.currentDrawerId) return
      const idx = Math.floor(Math.random() * room.wordChoices.length)
      chooseWord(io, room, room.currentDrawerId, idx)
    } catch (e) {
      console.error('[game] chooseTimeout error', e)
    }
  }, CHOOSE_TIME_MS)
}

function chooseWord(io: Server, room: ServerRoom, drawerId: string, wordIndex: number) {
  if (room.stage !== 'choosing' || room.currentDrawerId !== drawerId) return
  if (room.wordChoices.length === 0) return
  const idx = Math.max(0, Math.min(wordIndex, room.wordChoices.length - 1))
  const word = room.wordChoices[idx]

  room.currentWord = word
  roomWords.set(room.code, word)
  room.usedWords.add(word.toLowerCase())
  if (room.chooseTimeout) {
    clearTimeout(room.chooseTimeout)
    room.chooseTimeout = null
  }

  // Initial hint reveals no letters (just word length/underscores)
  room.hintRevealedCount = 0
  room.wordHint = makeWordHint(word, 0)
  room.stage = 'drawing'
  room.timeLeft = room.settings.drawTime
  room.canvas = { strokes: [], shapes: [] }

  console.log(`[game] room ${room.code} word chosen: "${word}" (len ${word.length})`)

  io.to(room.code).emit('game:word-chosen', {
    wordHint: room.wordHint,
    wordLength: word.length,
  })
  // Send the real word ONLY to the drawer
  io.to(drawerId).emit('game:your-word', { word })

  emitRoomState(io, room)

  // NO scheduled letter reveals — per user request, no hints of any type during the game.

  // 1s tick + schedule round end
  room.drawInterval = setInterval(() => {
    try {
      if (room.stage !== 'drawing') return
      // Pause timer if insufficient players (drawer or guesser missing)
      if (room.paused) return
      room.timeLeft = Math.max(0, room.timeLeft - 1)
      io.to(room.code).emit('game:timer', { timeLeft: room.timeLeft })
      if (room.timeLeft <= 0) {
        endRound(io, room)
      }
    } catch (e) {
      console.error('[game] tick error', e)
    }
  }, 1000)

  room.drawEndTimeout = setTimeout(() => {
    try {
      if (room.stage === 'drawing') endRound(io, room)
    } catch (e) {
      console.error('[game] drawEnd error', e)
    }
  }, room.settings.drawTime * 1000)
}

function endRound(io: Server, room: ServerRoom) {
  if (room.stage !== 'drawing' && room.stage !== 'choosing') return
  clearTimers(room)

  const word = room.currentWord ?? ''
  room.stage = 'round-end'
  room.timeLeft = 0

  // Build gallery item from current canvas
  const drawer = room.players.find((p) => p.id === room.currentDrawerId)
  const galleryItem: GalleryItem = {
    id: rid(),
    round: room.currentRound,
    word,
    drawerId: room.currentDrawerId ?? '',
    drawerName: drawer?.name ?? 'Unknown',
    strokes: room.canvas.strokes.map((s) => ({ ...s, points: s.points.slice() })),
    shapes: room.canvas.shapes.map((s) => ({ ...s })),
  }
  if (word) room.gallery.push(galleryItem)

  const scores: Record<string, number> = {}
  for (const p of room.players) scores[p.id] = p.score

  console.log(
    `[game] room ${room.code} round ${room.currentRound} end. word="${word}" scores=${JSON.stringify(scores)}`
  )

  io.to(room.code).emit('game:round-end', { word, scores, galleryItem })
  emitRoomState(io, room)

  room.roundEndTimeout = setTimeout(() => {
    try {
      advanceRound(io, room)
    } catch (e) {
      console.error('[game] advanceRound error', e)
    }
  }, ROUND_END_DELAY_MS)
}

function advanceRound(io: Server, room: ServerRoom) {
  if (room.stage !== 'round-end') return
  clearTimers(room)

  room.currentDrawIndex++
  if (room.currentDrawIndex >= room.drawOrder.length) {
    // Round complete → next round (or end game)
    room.currentRound++
    if (room.currentRound > room.totalRounds) {
      endGame(io, room)
      return
    }
    room.currentDrawIndex = 0
    // Optionally reshuffle draw order for the new round
    const connected = room.players.filter((p) => p.connected && !p.isSpectator).map((p) => p.id)
    room.drawOrder = shuffle(connected)
  }
  startRound(io, room)
}

function endGame(io: Server, room: ServerRoom) {
  clearTimers(room)
  room.stage = 'game-end'
  room.currentDrawerId = null
  room.currentWord = null
  roomWords.set(room.code, '')
  room.wordHint = ''
  room.timeLeft = 0

  const finalScores: Record<string, number> = {}
  for (const p of room.players) finalScores[p.id] = p.score

  console.log(`[game] room ${room.code} GAME END. finalScores=${JSON.stringify(finalScores)}`)

  io.to(room.code).emit('game:game-end', { finalScores })
  emitRoomState(io, room)
}

// ----------------------------------------------------------------------------
// Player / room lifecycle
// ----------------------------------------------------------------------------

function makePlayer(socketId: string, name: string, avatar: string, color: string, isHost: boolean, isSpectator = false, customAvatar: string | null = null): Player {
  // Cap customAvatar size to ~32KB to prevent abuse; store as-is otherwise.
  const safeCustom = customAvatar && customAvatar.startsWith('data:image/') && customAvatar.length < 33000
    ? customAvatar
    : null
  return {
    id: socketId,
    name: name.slice(0, 24) || 'Player',
    avatar: avatar || '🐱',
    color: color || '#f97316',
    score: 0,
    connected: true,
    guessedThisRound: false,
    isHost,
    isSpectator,
    customAvatar: safeCustom,
  }
}

// Grace period (ms) before a disconnected player is fully removed from a room.
// Allows page-refresh / brief network drop to reconnect without losing the seat.
// 60s covers slow reloads + brief connectivity blips.
const RECONNECT_GRACE_MS = 60_000
const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()

// ---- Recent-scores helpers (for rejoin after grace expires) ----
function rememberScore(roomCode: string, name: string, score: number, avatar: string, color: string) {
  if (!name) return
  let m = recentScores.get(roomCode)
  if (!m) { m = new Map(); recentScores.set(roomCode, m) }
  m.set(name.toLowerCase(), { score, ts: Date.now(), avatar, color })
  // Lazy TTL sweep: drop entries older than TTL whenever we write.
  const cutoff = Date.now() - RECENT_SCORE_TTL_MS
  for (const [k, v] of m) if (v.ts < cutoff) m.delete(k)
}

function recallScore(roomCode: string, name: string): { score: number; avatar: string; color: string } | null {
  const m = recentScores.get(roomCode)
  if (!m) return null
  const entry = m.get(name.toLowerCase())
  if (!entry) return null
  if (Date.now() - entry.ts > RECENT_SCORE_TTL_MS) { m.delete(name.toLowerCase()); return null }
  return { score: entry.score, avatar: entry.avatar, color: entry.color }
}

function clearRecentScores(roomCode: string) {
  recentScores.delete(roomCode)
}

function removePlayerFromRoom(io: Server, socket: Socket, playerId: string, immediate = false) {
  const lookup = players.get(playerId)
  if (!lookup) return
  const room = rooms.get(lookup.roomId)
  players.delete(playerId)
  socket.leave(lookup.roomId)
  if (!room) return

  const player = room.players.find((p) => p.id === playerId)
  if (!player) return

  const wasDrawer = room.currentDrawerId === playerId
  const wasHost = room.hostId === playerId
  const stage = room.stage
  const inGame = stage === 'choosing' || stage === 'drawing' || stage === 'round-end'

  if (immediate || !inGame) {
    // Immediate removal (lobby / game-end / explicit leave / kick)
    room.players = room.players.filter((p) => p.id !== playerId)
    room.drawOrder = room.drawOrder.filter((id) => id !== playerId)
    io.to(room.code).emit('room:player-left', { playerId })
    console.log(`[room] ${room.code} ${player.name} left (immediate). players=${room.players.length}`)
    if (room.players.length === 0) { deleteRoom(io, room.code); return }
    if (wasHost) {
      const next = room.players.find((p) => p.connected)
      if (next) { next.isHost = true; room.hostId = next.id; console.log(`[room] ${room.code} host reassigned to ${next.name}`) }
    }
    if (wasDrawer && (stage === 'drawing' || stage === 'choosing')) {
      console.log(`[room] ${room.code} drawer left; ending round`)
      endRound(io, room)
      return
    }
    if (inGame && room.stage !== 'game-end') {
      const connectedCount = room.players.filter((p) => p.connected && !p.isSpectator).length
      if (connectedCount < 2) {
        console.log(`[room] ${room.code} not enough players (${connectedCount}); ending game`)
        endGame(io, room)
        return
      }
    }
    emitRoomState(io, room)
    return
  }

  // ---- In-game disconnect: mark disconnected, start grace timer ----
  player.connected = false
  io.to(room.code).emit('room:player-left', { playerId })
  emitRoomState(io, room)
  console.log(`[room] ${room.code} ${player.name} disconnected (grace ${RECONNECT_GRACE_MS}ms)`)

  // If the drawer disconnected mid-round, PAUSE (don't end round) so they can reconnect.
  // The timer is paused via maybePause below.
  if (wasDrawer && (stage === 'drawing' || stage === 'choosing')) {
    console.log(`[room] ${room.code} drawer disconnected; pausing round`)
  }

  // Pause if insufficient players (drawer or guesser missing). This gives a
  // reconnect window instead of immediately ending the round/game.
  maybePause(io, room)

  // If still insufficient after grace period, end the game.
  const connectedCount = room.players.filter((p) => p.connected && !p.isSpectator).length
  if (connectedCount < 2 && room.stage !== 'game-end') {
    if (reconnectTimers.has(room.code)) clearTimeout(reconnectTimers.get(room.code)!)
    const t = setTimeout(() => {
      try {
        const stillLow = room.players.filter((p) => p.connected && !p.isSpectator).length < 2
        if (stillLow && room.stage !== 'game-end' && room.stage !== 'lobby') {
          console.log(`[room] ${room.code} not enough players after grace; ending game`)
          room.players = room.players.filter((p) => p.connected)
          endGame(io, room)
        }
      } catch (e) { console.error('[room] grace-endgame error', e) }
    }, RECONNECT_GRACE_MS)
    reconnectTimers.set(room.code, t)
  }

  // Schedule full removal after grace period
  const removeTimer = setTimeout(() => {
    try {
      const stillInRoom = room.players.find((p) => p.id === playerId)
      if (!stillInRoom || stillInRoom.connected) return
      // Before removing, remember the player's score so a later rejoin
      // (after grace expired) can restore it.
      rememberScore(room.code, player.name, player.score, player.avatar, player.color)
      room.players = room.players.filter((p) => p.id !== playerId)
      room.drawOrder = room.drawOrder.filter((id) => id !== playerId)
      if (wasHost && room.players.length > 0) {
        const next = room.players.find((p) => p.connected)
        if (next) { next.isHost = true; room.hostId = next.id }
      }
      io.to(room.code).emit('room:player-left', { playerId })
      emitRoomState(io, room)
      console.log(`[room] ${room.code} ${player.name} removed after grace. players=${room.players.length}`)
      if (room.players.length === 0) deleteRoom(io, room.code)
    } catch (e) { console.error('[room] grace-remove error', e) }
  }, RECONNECT_GRACE_MS)
  reconnectTimers.set(playerId, removeTimer)
}

// ----------------------------------------------------------------------------
// Chat / guessing
// ----------------------------------------------------------------------------

function broadcastChat(io: Server, room: ServerRoom, message: ChatMessage) {
  room.chat.push(message)
  if (room.chat.length > 300) room.chat.splice(0, room.chat.length - 300)
  io.to(room.code).emit('chat:message', { message })
}

function handleChat(io: Server, socket: Socket, content: string) {
  const lookup = players.get(socket.id)
  if (!lookup) return
  const room = rooms.get(lookup.roomId)
  if (!room) return
  const player = room.players.find((p) => p.id === socket.id)
  if (!player) return

  const text = (content ?? '').toString().slice(0, 200).trim()
  if (!text) return

  const ts = now()
  const word = room.currentWord ?? ''
  const wordLower = word.trim().toLowerCase()

  // ── Anti-cheat: prevent word leak via chat ──
  // The drawer and already-guessed players KNOW the word. If they type it
  // (or a very close match) in chat, drop the message silently so it's
  // never revealed to non-guessers.
  const textLower = text.toLowerCase()
  const isWordLeak = wordLower && wordLower.length > 2 && (() => {
    // Exact match — always block
    if (textLower === wordLower) return true
    // For longer words (5+ chars): check if text contains the word as a substring
    if (wordLower.length >= 5 && textLower.includes(wordLower)) return true
    // For words 5+ chars: check close match (Levenshtein ≤ 2)
    // Don't apply to short words (3-4 chars) — too many false positives
    if (wordLower.length >= 5) {
      const d = levenshteinDistance(textLower, wordLower)
      if (d <= 2 && d > 0) return true
    }
    return false
  })()

  // Drawer & spectators can't score; treat as plain chat (but filter word leaks)
  if (room.currentDrawerId === player.id || player.isSpectator) {
    if (isWordLeak) return // silently drop — don't reveal the word
    const msg: ChatMessage = {
      id: rid(),
      playerId: player.id,
      name: player.name,
      content: text,
      type: 'chat',
      timestamp: ts,
    }
    broadcastChat(io, room, msg)
    return
  }

  // Only meaningful during 'drawing'
  if (room.stage !== 'drawing') {
    const msg: ChatMessage = {
      id: rid(),
      playerId: player.id,
      name: player.name,
      content: text,
      type: 'chat',
      timestamp: ts,
    }
    broadcastChat(io, room, msg)
    return
  }

  // Already guessed this round → just chat (but filter word leaks)
  if (player.guessedThisRound) {
    if (isWordLeak) return // silently drop — don't reveal the word
    const msg: ChatMessage = {
      id: rid(),
      playerId: player.id,
      name: player.name,
      content: text,
      type: 'chat',
      timestamp: ts,
    }
    broadcastChat(io, room, msg)
    return
  }

  // Correct guess
  if (word && text.toLowerCase() === word.trim().toLowerCase()) {
    player.guessedThisRound = true
    const drawTime = Math.max(1, room.settings.drawTime)
    const timeRatio = room.timeLeft / drawTime // 0..1 (1 = just started)

    // ---- Time-based scoring ONLY ----
    // Guesser: points inversely proportional to time taken.
    //   Faster guess → more timeLeft → more points.
    //   Range: 50 (last second) .. 300 (instant).
    const points = Math.round(50 + timeRatio * 250)
    player.score += points

    // Drawer: also time-based. Gets points per guesser based on how fast
    //   they guessed (timeLeft at moment of guess).
    //   Range: 10 (last second) .. 50 (instant) per guesser.
    const drawerBonus = Math.round(10 + timeRatio * 40)

    const drawer = room.players.find((p) => p.id === room.currentDrawerId)
    if (drawer) drawer.score += drawerBonus

    console.log(
      `[chat] room ${room.code} ${player.name} guessed (+${points}, drawer +${drawerBonus})`
    )

    io.to(room.code).emit('game:player-guessed', {
      playerId: player.id,
      points,
      drawerBonus,
    })

    // Correct chat message — do NOT reveal the word
    const correctMsg: ChatMessage = {
      id: rid(),
      playerId: player.id,
      name: player.name,
      content: `${player.name} guessed the word!`,
      type: 'correct',
      timestamp: ts,
    }
    broadcastChat(io, room, correctMsg)
    emitRoomState(io, room)

    // Check if all non-drawer players have guessed → end round immediately.
    const remaining = room.players.filter(
      (p) => p.id !== room.currentDrawerId && p.connected && !p.isSpectator && !p.guessedThisRound
    )
    if (remaining.length === 0) {
      endRound(io, room)
    }
    return
  }

  // Close guess — notify everyone prominently
  if (word && isCloseGuess(text, word)) {
    // Show the guess as a close-guess message
    const guessMsg: ChatMessage = {
      id: rid(),
      playerId: player.id,
      name: player.name,
      content: text,
      type: 'close',
      close: true,
      timestamp: ts,
    }
    broadcastChat(io, room, guessMsg)
    // Also broadcast a prominent system notification
    const notifyMsg: ChatMessage = {
      id: rid(),
      playerId: 'system',
      name: 'System',
      content: `🔥 ${player.name} is close — almost correct!`,
      type: 'system',
      timestamp: ts + 1,
    }
    broadcastChat(io, room, notifyMsg)
    return
  }

  // Normal guess
  const msg: ChatMessage = {
    id: rid(),
    playerId: player.id,
    name: player.name,
    content: text,
    type: 'guess',
    timestamp: ts,
  }
  broadcastChat(io, room, msg)
}

// ----------------------------------------------------------------------------
// Socket.IO server setup
// ----------------------------------------------------------------------------

const httpServer = createServer()
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  path: '/socket.io',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

io.on('connection', (socket) => {
  console.log(`[io] connected ${socket.id}`)

  // ----- room:create ------------------------------------------------------
  socket.on('room:create', (payload, cb) => {
    try {
      const { name, avatar, color, customAvatar, roomName } = (payload || {}) as {
        name: string; avatar: string; color: string; customAvatar?: string | null; roomName?: string
      }
      const code = generateRoomCode()
      let c = code
      let tries = 0
      while (rooms.has(c) && tries < 50) {
        c = generateRoomCode()
        tries++
      }

      const player = makePlayer(socket.id, name, avatar, color, true, false, customAvatar ?? null)
      const rName = (roomName || '').trim().slice(0, 40) || `${name}'s Room`
      const room: ServerRoom = {
        code: c,
        name: rName,
        hostId: player.id,
        players: [player],
        settings: { ...DEFAULT_SETTINGS },
        stage: 'lobby',
        currentRound: 0,
        totalRounds: DEFAULT_SETTINGS.rounds,
        currentDrawerId: null,
        wordHint: '',
        timeLeft: 0,
        paused: false,
        chat: [],
        gallery: [],
        canvas: { strokes: [], shapes: [] },
        drawOrder: [],
        currentDrawIndex: 0,
        wordChoices: [],
        currentWord: null,
        hintRevealedCount: 0,
        usedWords: new Set<string>(),
        chooseTimeout: null,
        drawInterval: null,
        drawEndTimeout: null,
        hintTimeouts: [],
        roundEndTimeout: null,
      }
      rooms.set(c, room)
      roomWords.set(c, '')
      players.set(socket.id, { socketId: socket.id, roomId: c, player })
      socket.join(c)

      console.log(`[room] created ${c} by ${player.name} (${socket.id})`)
      cb({ ok: true, roomCode: c, playerId: player.id })
      emitRoomStateToSocket(socket, room)
      // Queen arrival for special names
      if (isRoyalName(player.name)) {
        setTimeout(() => announceQueen(io, c, player.name, player.avatar), 500)
      }
    } catch (e) {
      console.error('[room:create] error', e)
      cb({ ok: false, error: 'Failed to create room' })
      socket.emit('room:error', { message: 'Failed to create room' })
    }
  })

  // ----- room:join --------------------------------------------------------
  socket.on('room:join', (payload, cb) => {
    try {
      const { roomCode, name, avatar, color, isSpectator, customAvatar } = (payload || {}) as {
        roomCode: string; name: string; avatar: string; color: string; isSpectator?: boolean; customAvatar?: string | null
      }
      const code = (roomCode || '').toUpperCase().trim()
      const room = rooms.get(code)
      if (!room) {
        cb({ ok: false, error: 'Room not found' })
        return
      }

      const trimmedName = (name || '').trim().slice(0, 24)

      // ---- RECONNECT: same name already in this room (disconnected) ----
      const existing = room.players.find(
        (p) => p.name.toLowerCase() === trimmedName.toLowerCase() && !p.connected
      )
      if (existing) {
        const t = reconnectTimers.get(existing.id)
        if (t) { clearTimeout(t); reconnectTimers.delete(existing.id) }
        const oldId = existing.id
        existing.id = socket.id
        existing.connected = true
        existing.avatar = avatar || existing.avatar
        existing.color = color || existing.color
        // Update custom avatar on reconnect (in case they re-drew it)
        if (customAvatar !== undefined) existing.customAvatar = customAvatar ?? null
        room.drawOrder = room.drawOrder.map((id) => (id === oldId ? socket.id : id))
        if (room.currentDrawerId === oldId) room.currentDrawerId = socket.id
        if (room.hostId === oldId) room.hostId = socket.id
        players.set(socket.id, { socketId: socket.id, roomId: code, player: existing })
        socket.join(code)
        console.log(`[room] ${existing.name} reconnected to ${code} (was ${oldId})`)
        cb({ ok: true, room: publicRoom(room), playerId: existing.id })
        io.to(code).emit('room:state', { room: publicRoom(room) })
        // If the game was paused (insufficient players), try to resume now.
        if (room.paused) maybeResume(io, room)
        if (room.stage === 'drawing') {
          socket.emit('game:canvas', {
            strokes: room.canvas.strokes.map((s) => ({ ...s, points: s.points.slice() })),
            shapes: room.canvas.shapes.map((s) => ({ ...s })),
          })
          if (room.currentDrawerId === socket.id) {
            const w = roomWords.get(code)
            if (w) socket.emit('game:your-word', { word: w })
          }
        }
        return
      }

      // ---- Spectator join (can join mid-game) ----
      const spectator = !!isSpectator
      if (room.players.filter((p) => p.connected && !p.isSpectator).length >= MAX_PLAYERS && !spectator) {
        cb({ ok: false, error: 'Room is full' })
        return
      }
      // Mid-game join is normally blocked — BUT if this name was recently in
      // the room (score remembered), treat it as a reconnect: restore the
      // score and allow the join as a player. This makes page-refreshes /
      // tab-closes fully recoverable even after the grace window expires.
      const recalled = !spectator && room.stage !== 'lobby'
        ? recallScore(code, trimmedName)
        : null
      if (!spectator && room.stage !== 'lobby' && !recalled) {
        cb({ ok: false, error: 'Game already started — rejoin with the same name to reconnect, or join as spectator.' })
        return
      }
      // Spectators can always join (even mid-game)

      const player = makePlayer(socket.id, name, avatar, color, false, spectator, customAvatar ?? null)
      // Restore score if we remembered one for this name.
      if (recalled) {
        player.score = recalled.score
        console.log(`[room] ${code} ${player.name} rejoined after grace; restored score=${player.score}`)
      }
      room.players.push(player)
      // If mid-game and rejoining as a player, add to drawOrder for subsequent rounds.
      if (recalled && room.stage !== 'lobby' && !room.drawOrder.includes(player.id)) {
        room.drawOrder.push(player.id)
      }
      players.set(socket.id, { socketId: socket.id, roomId: code, player })
      socket.join(code)

      console.log(`[room] ${player.name} (${socket.id}) ${spectator ? 'spectated' : 'joined'} ${code}; players=${room.players.length}`)

      cb({ ok: true, room: publicRoom(room), playerId: player.id })

      // Notify others, then send state to joiner
      socket.to(code).emit('room:player-joined', { player: { ...player } })
      emitRoomStateToSocket(socket, room)

      // Queen arrival for special names
      if (isRoyalName(player.name)) {
        setTimeout(() => announceQueen(io, code, player.name, player.avatar), 500)
      }

      // Late-joiner canvas snapshot (only meaningful if we ever allow mid-game join)
      if ((room.stage as string) === 'drawing') {
        socket.emit('game:canvas', {
          strokes: room.canvas.strokes.map((s) => ({ ...s, points: s.points.slice() })),
          shapes: room.canvas.shapes.map((s) => ({ ...s })),
        })
      }

      // If the game was paused (insufficient players) and a player rejoined,
      // try to resume.
      if (recalled && room.paused) maybeResume(io, room)
    } catch (e) {
      console.error('[room:join] error', e)
      cb({ ok: false, error: 'Failed to join room' })
      socket.emit('room:error', { message: 'Failed to join room' })
    }
  })

  // ----- room:leave -------------------------------------------------------
  socket.on('room:leave', () => {
    try {
      removePlayerFromRoom(io, socket, socket.id, true) // explicit leave = immediate
    } catch (e) {
      console.error('[room:leave] error', e)
    }
  })

  // ----- room:update-settings --------------------------------------------
  socket.on('room:update-settings', (payload) => {
    try {
      const lookup = players.get(socket.id)
      if (!lookup) return
      const room = rooms.get(lookup.roomId)
      if (!room) return
      if (room.hostId !== socket.id) {
        socket.emit('room:error', { message: 'Only the host can change settings' })
        return
      }
      // Prevent settings changes mid-game (corrupts scoring ratio, round count, etc.)
      if (room.stage !== 'lobby' && room.stage !== 'game-end') {
        socket.emit('room:error', { message: 'Settings can only be changed in the lobby' })
        return
      }
      const s = payload?.settings || {}
      const merged: GameSettings = { ...room.settings }
      if (typeof s.rounds === 'number') {
        merged.rounds = Math.max(1, Math.min(20, Math.floor(s.rounds)))
      }
      if (typeof s.drawTime === 'number') {
        merged.drawTime = Math.max(30, Math.min(180, Math.floor(s.drawTime)))
      }
      if (typeof s.difficulty === 'string') {
        const allowed: WordDifficulty[] = ['easy', 'medium', 'hard', 'mixed']
        if (allowed.includes(s.difficulty as WordDifficulty)) {
          merged.difficulty = s.difficulty as WordDifficulty
        }
      }
      room.settings = merged
      console.log(`[room] ${room.code} settings updated: ${JSON.stringify(merged)}`)
      io.to(room.code).emit('room:settings-updated', { settings: merged })
      emitRoomState(io, room)
    } catch (e) {
      console.error('[room:update-settings] error', e)
      socket.emit('room:error', { message: 'Failed to update settings' })
    }
  })

  // ----- room:set-name ----------------------------------------------------
  socket.on('room:set-name', (payload) => {
    try {
      const lookup = players.get(socket.id)
      if (!lookup) return
      const room = rooms.get(lookup.roomId)
      if (!room) return
      if (room.hostId !== socket.id) {
        socket.emit('room:error', { message: 'Only the host can rename the room' })
        return
      }
      const name = (payload?.name || '').trim().slice(0, 40)
      if (!name) return
      room.name = name
      emitRoomState(io, room)
    } catch (e) {
      console.error('[room:set-name] error', e)
    }
  })

  // ----- spectator:promote (host promotes a spectator to player) ----------
  socket.on('spectator:promote', (payload) => {
    try {
      const lookup = players.get(socket.id)
      if (!lookup) return
      const room = rooms.get(lookup.roomId)
      if (!room) return
      if (room.hostId !== socket.id) {
        socket.emit('room:error', { message: 'Only the host can promote spectators' })
        return
      }
      const target = room.players.find((p) => p.id === payload?.playerId)
      if (!target || !target.isSpectator) return
      target.isSpectator = false
      // If mid-game, add to drawOrder for subsequent rounds
      if (room.stage !== 'lobby' && !room.drawOrder.includes(target.id)) {
        room.drawOrder.push(target.id)
      }
      console.log(`[room] ${room.code} spectator ${target.name} promoted to player`)
      // Broadcast a system chat message
      broadcastChat(io, room, {
        id: rid(), playerId: 'system', name: 'System',
        content: `${target.name} joined the game as a player!`, type: 'system', timestamp: now(),
      })
      // If the game was paused due to insufficient players, try to resume
      if (room.paused) maybeResume(io, room)
      emitRoomState(io, room)
    } catch (e) {
      console.error('[spectator:promote] error', e)
    }
  })

  // ----- spectator:volunteer (spectator promotes themselves) --------------
  socket.on('spectator:volunteer', () => {
    try {
      const lookup = players.get(socket.id)
      if (!lookup) return
      const room = rooms.get(lookup.roomId)
      if (!room) return
      const target = room.players.find((p) => p.id === socket.id)
      if (!target || !target.isSpectator) return
      target.isSpectator = false
      if (room.stage !== 'lobby' && !room.drawOrder.includes(target.id)) {
        room.drawOrder.push(target.id)
      }
      console.log(`[room] ${room.code} spectator ${target.name} volunteered as player`)
      broadcastChat(io, room, {
        id: rid(), playerId: 'system', name: 'System',
        content: `${target.name} jumped in as a player!`, type: 'system', timestamp: now(),
      })
      if (room.paused) maybeResume(io, room)
      emitRoomState(io, room)
    } catch (e) {
      console.error('[spectator:volunteer] error', e)
    }
  })

  // ----- room:back-to-lobby ------------------------------------------------
  // After game-end, host can send everyone back to the lobby (instead of
  // instantly restarting). This lets players decide if they want to play
  // again, invite more friends, change settings, etc. The host can then
  // start a new game from the lobby when everyone's ready.
  socket.on('room:back-to-lobby', () => {
    try {
      const lookup = players.get(socket.id)
      if (!lookup) return
      const room = rooms.get(lookup.roomId)
      if (!room) return
      if (room.hostId !== socket.id) {
        socket.emit('room:error', { message: 'Only the host can return to lobby' })
        return
      }
      if (room.stage !== 'game-end') return
      clearTimers(room)
      room.stage = 'lobby'
      room.currentDrawerId = null
      room.currentWord = null
      roomWords.set(room.code, '')
      room.wordHint = ''
      room.timeLeft = 0
      room.paused = false
      room.currentRound = 0
      room.currentDrawIndex = 0
      room.drawOrder = []
      // Keep scores visible in lobby until a new game starts, but reset on start.
      // Reset guessedThisRound for cleanliness.
      for (const p of room.players) p.guessedThisRound = false
      broadcastChat(io, room, {
        id: rid(), playerId: 'system', name: 'System',
        content: '🏠 Back to the lobby! Host can start a new game when everyone is ready.',
        type: 'system', timestamp: now(),
      })
      emitRoomState(io, room)
      console.log(`[room] ${room.code} back to lobby after game-end`)
    } catch (e) {
      console.error('[room:back-to-lobby] error', e)
    }
  })

  // ----- room:start -------------------------------------------------------
  socket.on('room:start', () => {
    try {
      const lookup = players.get(socket.id)
      if (!lookup) return
      const room = rooms.get(lookup.roomId)
      if (!room) return
      if (room.hostId !== socket.id) {
        socket.emit('room:error', { message: 'Only the host can start the game' })
        return
      }
      // Allow starting from lobby (first game) or game-end (Play Again).
      if (room.stage !== 'lobby' && room.stage !== 'game-end') {
        socket.emit('room:error', { message: 'Game already started' })
        return
      }
      const connected = room.players.filter((p) => p.connected && !p.isSpectator)
      if (connected.length < 2) {
        socket.emit('room:error', { message: 'Need at least 2 players to start' })
        return
      }
      room.totalRounds = room.settings.rounds
      room.currentRound = 1
      room.currentDrawIndex = 0
      room.drawOrder = shuffle(connected.map((p) => p.id))
      room.paused = false // reset paused state for fresh game
      // Reset scores, gallery, canvas for a fresh game
      for (const p of room.players) {
        p.score = 0
        p.guessedThisRound = false
      }
      room.gallery = []
      room.canvas = { strokes: [], shapes: [] }
      room.currentWord = null
      roomWords.set(room.code, '')
      room.wordHint = ''
      room.usedWords.clear() // reset used words for fresh game
      console.log(`[game] room ${room.code} START. rounds=${room.totalRounds} drawOrder=${room.drawOrder.join(',')}`)
      startRound(io, room)
    } catch (e) {
      console.error('[room:start] error', e)
      socket.emit('room:error', { message: 'Failed to start game' })
    }
  })

  // ----- room:kick --------------------------------------------------------
  socket.on('room:kick', (payload) => {
    try {
      const lookup = players.get(socket.id)
      if (!lookup) return
      const room = rooms.get(lookup.roomId)
      if (!room) return
      if (room.hostId !== socket.id) {
        socket.emit('room:error', { message: 'Only the host can kick players' })
        return
      }
      const targetId = payload?.playerId
      if (!targetId || targetId === socket.id) return
      // ── Security: verify the target is actually in THIS room ──
      const targetInRoom = room.players.find((p) => p.id === targetId)
      if (!targetInRoom) {
        socket.emit('room:error', { message: 'Player not in this room' })
        return
      }
      const targetSocket = io.sockets.sockets.get(targetId) as Socket | undefined
      if (targetSocket) {
        removePlayerFromRoom(io, targetSocket, targetId, true) // kick = immediate
        targetSocket.emit('room:error', { message: 'You were removed from the room' })
      } else {
        // Socket disconnected — just remove from room data
        room.players = room.players.filter((p) => p.id !== targetId)
        room.drawOrder = room.drawOrder.filter((id) => id !== targetId)
        io.to(room.code).emit('room:player-left', { playerId: targetId })
        emitRoomState(io, room)
      }
    } catch (e) {
      console.error('[room:kick] error', e)
    }
  })

  // ----- game:choose-word -------------------------------------------------
  socket.on('game:choose-word', (payload) => {
    try {
      const lookup = players.get(socket.id)
      if (!lookup) return
      const room = rooms.get(lookup.roomId)
      if (!room) return
      if (room.stage !== 'choosing' || room.currentDrawerId !== socket.id) return
      chooseWord(io, room, socket.id, payload?.wordIndex ?? 0)
    } catch (e) {
      console.error('[game:choose-word] error', e)
    }
  })

  // ----- Drawing events ---------------------------------------------------

  const ensureDrawer = (): ServerRoom | null => {
    const lookup = players.get(socket.id)
    if (!lookup) return null
    const room = rooms.get(lookup.roomId)
    if (!room) return null
    if (room.stage !== 'drawing') return null
    if (room.currentDrawerId !== socket.id) return null
    return room
  }

  socket.on('game:stroke-start', (payload) => {
    try {
      const room = ensureDrawer()
      if (!room) return
      const { strokeId, color, size, brush, x, y } = payload || ({} as any)
      const stroke: Stroke = {
        id: strokeId || rid(),
        color: color || '#000000',
        size: typeof size === 'number' ? size : 8,
        brush: (brush as BrushType) || 'pen',
        points: [{ x, y }],
      }
      room.canvas.strokes.push(stroke)
      socket.to(room.code).emit('game:stroke-start', {
        strokeId: stroke.id,
        color: stroke.color,
        size: stroke.size,
        brush: stroke.brush,
        x,
        y,
      })
    } catch (e) {
      console.error('[game:stroke-start] error', e)
    }
  })

  socket.on('game:stroke-point', (payload) => {
    try {
      const room = ensureDrawer()
      if (!room) return
      const { strokeId, x, y } = payload || ({} as any)
      const stroke = room.canvas.strokes.find((s) => s.id === strokeId)
      if (!stroke) return
      stroke.points.push({ x, y })
      socket.to(room.code).emit('game:stroke-point', { strokeId, x, y })
    } catch (e) {
      console.error('[game:stroke-point] error', e)
    }
  })

  socket.on('game:stroke-end', (payload) => {
    try {
      const room = ensureDrawer()
      if (!room) return
      const { strokeId } = payload || ({} as any)
      socket.to(room.code).emit('game:stroke-end', { strokeId })
    } catch (e) {
      console.error('[game:stroke-end] error', e)
    }
  })

  socket.on('game:shape', (payload) => {
    try {
      const room = ensureDrawer()
      if (!room) return
      const shape = payload?.shape
      if (!shape || !shape.id) return
      const cloned: ShapeStroke = {
        id: shape.id,
        kind: shape.kind,
        color: shape.color,
        size: shape.size,
        start: { ...shape.start },
        end: { ...shape.end },
      }
      room.canvas.shapes.push(cloned)
      socket.to(room.code).emit('game:shape', { shape: cloned })
    } catch (e) {
      console.error('[game:shape] error', e)
    }
  })

  socket.on('game:fill', (payload) => {
    try {
      const room = ensureDrawer()
      if (!room) return
      const { x, y, color } = payload || ({} as any)
      socket.to(room.code).emit('game:fill', { x, y, color })
    } catch (e) {
      console.error('[game:fill] error', e)
    }
  })

  socket.on('game:undo', () => {
    try {
      const room = ensureDrawer()
      if (!room) return
      // Prefer popping a stroke; otherwise pop a shape
      if (room.canvas.strokes.length > 0) {
        room.canvas.strokes.pop()
      } else if (room.canvas.shapes.length > 0) {
        room.canvas.shapes.pop()
      }
      io.to(room.code).emit('game:undo')
    } catch (e) {
      console.error('[game:undo] error', e)
    }
  })

  socket.on('game:clear', () => {
    try {
      const room = ensureDrawer()
      if (!room) return
      room.canvas.strokes = []
      room.canvas.shapes = []
      io.to(room.code).emit('game:clear')
    } catch (e) {
      console.error('[game:clear] error', e)
    }
  })

  // ----- chat:send --------------------------------------------------------
  // Rate limiting: max 1 message per 500ms per socket (module-level map)
  socket.on('chat:send', (payload) => {
    try {
      const nowMs = Date.now()
      const last = chatRateLimit.get(socket.id) ?? 0
      if (nowMs - last < 500) return // drop spam
      chatRateLimit.set(socket.id, nowMs)
      handleChat(io, socket, payload?.content ?? '')
    } catch (e) {
      console.error('[chat:send] error', e)
    }
  })

  // ----- chat:typing ------------------------------------------------------
  // Broadcast typing indicator to other players in the room (throttled).
  socket.on('chat:typing', () => {
    try {
      const nowMs = Date.now()
      const last = typingRateLimit.get(socket.id) ?? 0
      if (nowMs - last < 2000) return // throttle: max 1 per 2s
      typingRateLimit.set(socket.id, nowMs)

      const lookup = players.get(socket.id)
      if (!lookup) return
      const room = rooms.get(lookup.roomId)
      if (!room) return
      const player = room.players.find((p) => p.id === socket.id)
      if (!player) return
      // Only broadcast during active play
      if (room.stage !== 'drawing' && room.stage !== 'choosing') return
      // Broadcast to everyone EXCEPT the sender
      socket.to(room.code).emit('chat:typing', {
        playerId: socket.id,
        name: player.name,
      })
    } catch (e) {
      console.error('[chat:typing] error', e)
    }
  })

  // ----- chat:react -------------------------------------------------------
  // Broadcast emoji reaction on a chat message to the room.
  socket.on('chat:react', (payload) => {
    try {
      const lookup = players.get(socket.id)
      if (!lookup) return
      const room = rooms.get(lookup.roomId)
      if (!room) return
      const { messageId, emoji } = payload || {}
      if (!messageId || !emoji) return
      // Validate: emoji must be a short string (max 10 chars, no HTML)
      const emojiStr = String(emoji).slice(0, 10).replace(/[<>&"']/g, '')
      const msgIdStr = String(messageId).slice(0, 50).replace(/[<>&"']/g, '')
      if (!emojiStr || !msgIdStr) return
      // Broadcast to everyone in the room
      io.to(room.code).emit('chat:reaction', {
        messageId: msgIdStr,
        emoji: emojiStr,
        playerId: socket.id,
      })
    } catch (e) {
      console.error('[chat:react] error', e)
    }
  })

  // ----- reaction:send ----------------------------------------------------
  socket.on('reaction:send', (payload) => {
    try {
      const lookup = players.get(socket.id)
      if (!lookup) return
      const room = rooms.get(lookup.roomId)
      if (!room) return
      const { emoji, x } = payload || ({} as any)
      const reaction: Reaction = {
        id: rid(),
        emoji: emoji as ReactionEmoji,
        playerId: socket.id,
        x: typeof x === 'number' ? x : 0.5,
        ts: now(),
      }
      io.to(room.code).emit('reaction:show', { reaction })
    } catch (e) {
      console.error('[reaction:send] error', e)
    }
  })

  // ----- disconnect -------------------------------------------------------
  socket.on('disconnect', () => {
    try {
      console.log(`[io] disconnected ${socket.id}`)
      // Clean up rate-limiting entries
      chatRateLimit.delete(socket.id)
      typingRateLimit.delete(socket.id)
      removePlayerFromRoom(io, socket, socket.id)
    } catch (e) {
      console.error('[disconnect] error', e)
    }
  })

  socket.on('error', (err: unknown) => {
    console.error(`[io] socket error ${socket.id}`, err)
  })
})

// ----------------------------------------------------------------------------
// Boot
// ----------------------------------------------------------------------------

const PORT = Number(process.env.PORT) || 3003
httpServer.listen(PORT, () => {
  console.log(`Doodle Dash game server running on port ${PORT}`)
})

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`)
  for (const [code, room] of rooms) {
    clearTimers(room)
    io.to(code).emit('room:error', { message: 'Server is shutting down' })
  }
  rooms.clear()
  roomWords.clear()
  players.clear()
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
