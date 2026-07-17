// ============================================================================
// Doodle Dash — Canonical Game Types & Socket Protocol
// ----------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for the socket protocol + shared UI data.
// Game server (mini-services/game-server) AND all UI components MUST import
// from here. Do NOT redefine these types elsewhere.
// ============================================================================

export type GameStage =
  | "lobby" // waiting room, host configures & starts
  | "choosing" // drawer picks a word from 3 choices
  | "drawing" // drawer draws, others guess
  | "round-end" // round over, showing word + points
  | "game-end"; // all rounds done, final scoreboard

export type WordDifficulty = "easy" | "medium" | "hard" | "mixed";

export interface GameSettings {
  rounds: number; // total rounds (each player draws once per round)
  drawTime: number; // seconds per draw
  difficulty: WordDifficulty;
}

export const DEFAULT_SETTINGS: GameSettings = {
  rounds: 3,
  drawTime: 80,
  difficulty: "mixed",
};

export interface Player {
  id: string;
  name: string;
  avatar: string; // emoji
  color: string; // accent hex (gradient start)
  score: number;
  connected: boolean;
  guessedThisRound: boolean;
  isHost: boolean;
  isAI?: boolean;
  isSpectator?: boolean;
  /** Custom hand-drawn avatar as a PNG data URL. When set, overrides `avatar` emoji for ALL viewers. */
  customAvatar?: string | null;
}

// --- Drawing tools ---------------------------------------------------------

export type BrushType = "pen" | "marker" | "pencil" | "neon" | "eraser";
export type ShapeType = "line" | "rect" | "ellipse";
export type Tool = BrushType | "fill" | `shape:${ShapeType}`;

export interface Point {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
}

export interface Stroke {
  id: string;
  color: string;
  size: number; // px logical
  brush: BrushType;
  points: Point[];
}

export interface ShapeStroke {
  id: string;
  kind: ShapeType;
  color: string;
  size: number;
  start: Point;
  end: Point;
}

export type CanvasAction =
  | { type: "stroke"; stroke: Stroke }
  | { type: "shape"; shape: ShapeStroke }
  | { type: "fill"; x: number; y: number; color: string }
  | { type: "undo" }
  | { type: "clear" };

// --- Chat & reactions ------------------------------------------------------

export type ChatType = "chat" | "guess" | "correct" | "system" | "close";

export interface ChatMessage {
  id: string;
  playerId: string;
  name: string;
  content: string;
  type: ChatType;
  close?: boolean;
  timestamp: number;
}

export type ReactionEmoji = "❤️" | "😂" | "🔥" | "👏" | "😮" | "🎨" | "💩" | "🤔";

export interface Reaction {
  id: string;
  emoji: ReactionEmoji;
  playerId: string;
  x: number; // 0..1 horizontal anchor
  ts: number;
}

// --- Room ------------------------------------------------------------------

export interface Room {
  code: string;
  name: string;
  hostId: string;
  players: Player[];
  settings: GameSettings;
  stage: GameStage;
  currentRound: number;
  totalRounds: number;
  currentDrawerId: string | null;
  currentWord: string | null; // only drawer gets full word via game:your-word
  wordHint: string;
  timeLeft: number;
  paused: boolean; // true when insufficient players (drawer or guesser missing)
  chat: ChatMessage[];
  /** finished drawings for the replay gallery (word + drawerId + strokes) */
  gallery: GalleryItem[];
}

export interface GalleryItem {
  id: string;
  round: number;
  word: string;
  drawerId: string;
  drawerName: string;
  strokes: Stroke[];
  shapes: ShapeStroke[];
}

// --- Themes ----------------------------------------------------------------

export type ThemeName = "peach" | "mint" | "sky" | "lavender";

// ----------------------------------------------------------------------------
// Socket protocol
// ----------------------------------------------------------------------------

export interface ClientToServerEvents {
  "room:create": (
    payload: { name: string; avatar: string; color: string; customAvatar?: string | null; roomName?: string },
    cb: (res: { ok: boolean; error?: string; roomCode?: string; playerId?: string }) => void
  ) => void;
  "room:join": (
    payload: { roomCode: string; name: string; avatar: string; color: string; isSpectator?: boolean; customAvatar?: string | null },
    cb: (res: { ok: boolean; error?: string; room?: Room; playerId?: string }) => void
  ) => void;
  "room:leave": () => void;
  "room:update-settings": (payload: { settings: Partial<GameSettings> }) => void;
  "room:set-name": (payload: { name: string }) => void;
  "room:start": () => void;
  "room:kick": (payload: { playerId: string }) => void;
  "spectator:promote": (payload: { playerId: string }) => void; // host promotes a spectator to player
  "spectator:volunteer": () => void; // spectator volunteers themselves to become a player
  "game:choose-word": (payload: { wordIndex: number }) => void;
  "game:stroke-start": (payload: { strokeId: string; color: string; size: number; brush: BrushType; x: number; y: number }) => void;
  "game:stroke-point": (payload: { strokeId: string; x: number; y: number }) => void;
  "game:stroke-end": (payload: { strokeId: string }) => void;
  "game:shape": (payload: { shape: ShapeStroke }) => void;
  "game:fill": (payload: { x: number; y: number; color: string }) => void;
  "game:undo": () => void;
  "game:clear": () => void;
  "chat:send": (payload: { content: string }) => void;
  "reaction:send": (payload: { emoji: ReactionEmoji; x: number }) => void;
  "chat:typing": () => void;
  "chat:react": (payload: { messageId: string; emoji: string }) => void;
}

export interface ServerToClientEvents {
  "room:state": (payload: { room: Room }) => void;
  "room:player-joined": (payload: { player: Player }) => void;
  "room:player-left": (payload: { playerId: string }) => void;
  "room:settings-updated": (payload: { settings: GameSettings }) => void;
  "room:error": (payload: { message: string }) => void;
  "room:promote-request": (payload: { needed: "drawer" | "guesser" }) => void;
  "game:queen-arrival": (payload: { name: string; avatar: string }) => void; // confetti + queen welcome
  "game:your-turn": (payload: { wordChoices: string[] }) => void;
  "game:round-start": (payload: { round: number; drawerId: string; drawTime: number }) => void;
  "game:word-chosen": (payload: { wordHint: string; wordLength: number }) => void;
  "game:your-word": (payload: { word: string }) => void;
  "game:stroke-start": (payload: { strokeId: string; color: string; size: number; brush: BrushType; x: number; y: number }) => void;
  "game:stroke-point": (payload: { strokeId: string; x: number; y: number }) => void;
  "game:stroke-end": (payload: { strokeId: string }) => void;
  "game:shape": (payload: { shape: ShapeStroke }) => void;
  "game:fill": (payload: { x: number; y: number; color: string }) => void;
  "game:undo": () => void;
  "game:clear": () => void;
  "game:canvas": (payload: { strokes: Stroke[]; shapes: ShapeStroke[] }) => void;
  "game:timer": (payload: { timeLeft: number }) => void;
  "game:hint": (payload: { wordHint: string }) => void;
  "chat:message": (payload: { message: ChatMessage }) => void;
  "reaction:show": (payload: { reaction: Reaction }) => void;
  "game:player-guessed": (payload: { playerId: string; points: number; drawerBonus: number }) => void;
  "game:round-end": (payload: { word: string; scores: Record<string, number>; galleryItem?: GalleryItem }) => void;
  "game:game-end": (payload: { finalScores: Record<string, number> }) => void;
  "chat:typing": (payload: { playerId: string; name: string }) => void;
  "chat:reaction": (payload: { messageId: string; emoji: string; playerId: string; name: string }) => void;
}

// --- Static UI data --------------------------------------------------------

export const AVATARS = [
  "🐱", "🐶", "🦊", "🐼", "🐨", "🐸", "🐵", "🦁", "🐯", "🐰",
  "👽", "🤖", "👻", "🦄", "🐙", "🦋", "🐢", "🦉", "🐧", "🐳",
  "🐝", "🦖", "🦄", "🐲", "🦩", "🐹", "🐻", "🐷", "🐮", "🐔",
];

export const PLAYER_COLORS = [
  "#f97316", "#ef4444", "#ec4899", "#a855f7", "#8b5cf6",
  "#06b6d4", "#10b981", "#84cc16", "#eab308", "#f59e0b",
];

/** Canvas color palette (skribbl-style 22 swatches). */
export const CANVAS_COLORS = [
  "#ffffff", "#c1c1c1", "#ef130b", "#ff7100", "#ffe400", "#00cc00", "#00b2ff", "#231fd3", "#a300ba", "#d37caa", "#a0522d",
  "#000000", "#4c4c4c", "#740b07", "#c23800", "#e8a200", "#005510", "#00569e", "#0e0865", "#550069", "#a75574", "#63300d",
  "#ff69b4", "#ffb6c1", "#ffd700", "#90ee90", "#87ceeb", "#dda0dd", "#f0e68c", "#ffe4e1", "#98fb98", "#afeeee", "#e6e6fa",
];

/** Color-blind-safe palette (Okabe-Ito inspired, 22 distinct hues). */
export const CVD_COLORS = [
  "#ffffff", "#999999", "#d55e00", "#e69f00", "#f0e442", "#009e73", "#56b4e9", "#0072b2", "#cc79a7", "#b08bb0", "#8c564b",
  "#000000", "#4d4d4d", "#a03000", "#b85c00", "#c9b300", "#007a5a", "#0388b3", "#004d75", "#8c3a6a", "#7a5e7a", "#5e3a31",
];

/** Paper texture options. */
export type PaperTexture = "plain" | "dots" | "grid" | "parchment" | "dark";

/** Avatar frame definitions (all free). */
export const AVATAR_FRAMES = [
  { id: "none", label: "None" },
  { id: "gold", label: "Gold" },
  { id: "rainbow", label: "Rainbow" },
  { id: "neon", label: "Neon" },
  { id: "dotted", label: "Dotted" },
  { id: "frost", label: "Frost" },
] as const;

/** Canvas border styles (all free). */
export const CANVAS_BORDERS = [
  { id: "none", label: "None" },
  { id: "solid", label: "Solid" },
  { id: "dashed", label: "Dashed" },
  { id: "double", label: "Double" },
  { id: "glow", label: "Glow" },
  { id: "gradient", label: "Gradient" },
] as const;

export const BRUSH_SIZES = [4, 8, 16, 28];

export const BRUSHES: { type: BrushType; label: string; icon: string }[] = [
  { type: "pen", label: "Pen", icon: "pen" },
  { type: "marker", label: "Marker", icon: "highlighter" },
  { type: "pencil", label: "Pencil", icon: "pencil" },
  { type: "neon", label: "Neon", icon: "sparkles" },
  { type: "eraser", label: "Eraser", icon: "eraser" },
];

export const REACTIONS: ReactionEmoji[] = ["❤️", "😂", "🔥", "👏", "😮", "🎨", "💩", "🤔"];

// --- Helpers ---------------------------------------------------------------

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function makeWordHint(word: string, revealCount = 0): string {
  const letters = word.split("");
  const indices = letters.map((_, i) => i).filter((i) => /[a-zA-Z0-9]/.test(letters[i]));
  const reveal = new Set<number>();
  if (revealCount > 0 && indices.length) reveal.add(indices[0]);
  const pool = [...indices];
  while (reveal.size < Math.min(revealCount, indices.length) && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    reveal.add(pool.splice(idx, 1)[0]);
  }
  return letters
    .map((ch, i) => {
      if (ch === " ") return " ";
      if (/[a-zA-Z0-9]/.test(ch)) return reveal.has(i) ? ch.toUpperCase() : "_";
      return ch;
    })
    .join(" ");
}

export function isCloseGuess(guess: string, word: string): boolean {
  const g = guess.trim().toLowerCase();
  const w = word.trim().toLowerCase();
  if (g === w) return false;
  if (g.length < 2 || w.length < 2) return false;
  const d = levenshtein(g, w);
  return d <= 2 && d > 0;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}
