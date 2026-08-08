"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/game/types";
import { useGameStore } from "@/lib/game/store";
import { sfx, primeAudio } from "@/lib/game/sound";
import {
  loadSession,
  restoreSession,
  saveSession,
  clearSession,
  setPendingRejoin,
  getPendingRejoin,
} from "@/lib/game/session";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketSingleton: GameSocket | null = null;
// Tracks whether we've ever successfully connected in this tab's lifetime,
// so we can distinguish "initial connect" from "reconnect after a drop".
let hasConnectedBefore = false;

export function getSocket(): GameSocket {
  if (!socketSingleton) {
    const isSandbox =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.search.includes("XTransformPort") ||
        window.location.port === "81");

    const prodWsUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL || "";

    const url = isSandbox
      ? "/?XTransformPort=3003"
      : prodWsUrl || "";

    socketSingleton = io(url, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 1000,
      timeout: 12000,
    });
  }
  return socketSingleton;
}

// ----------------------------------------------------------------------------
// Auto-rejoin: called whenever the socket (re)connects. If we have a saved
// session (from localStorage) AND we don't currently have a live room in the
// store, re-issue `room:join` with the saved identity. The server matches by
// name and restores the seat (within its 20s grace window) or creates a new
// seat if the room is still in lobby.
// ----------------------------------------------------------------------------
function attemptAutoRejoin(reason: "init" | "reconnect") {
  const store = useGameStore.getState();
  // On INITIAL connect: if we already have a room in the store (e.g. HMR
  // preserved state), don't re-join — the server still has our socket.
  if (reason === "init" && store.room) return;

  // Try localStorage first (sync), then fall back to DB (async).
  // This makes the triple-fallback work: localStorage → cookie → DB.
  const syncSession = loadSession();
  if (syncSession) {
    doRejoin(syncSession, reason);
    return;
  }
  // No localStorage session — try async DB restore (uses cookie token).
  store.setRejoining(true);
  restoreSession().then((session) => {
    if (!session) {
      store.setRejoining(false);
      return;
    }
    console.log(`[session] restored from DB: ${session.roomCode} as ${session.name}`);
    doRejoin(session, reason);
  });
}

function doRejoin(session: ReturnType<typeof loadSession>, reason: "init" | "reconnect") {
  if (!session) return;
  const store = useGameStore.getState();
  // Don't loop forever — only attempt on genuine reconnects.
  if (reason === "reconnect" && getPendingRejoin() === session.roomCode) {
    return;
  }
  setPendingRejoin(session.roomCode);
  store.setRejoining(true);
  // Safety: if the ack never fires, clear the rejoining flag after 10s.
  const safety = setTimeout(() => {
    if (getPendingRejoin() === session.roomCode) {
      setPendingRejoin(null);
      useGameStore.getState().setRejoining(false);
    }
  }, 10_000);
  const socket = getSocket();
  console.log(`[session] auto-rejoin "${session.roomCode}" (${reason})`);
  store.setIdentity({
    name: session.name,
    avatar: session.avatar,
    color: session.color,
  });
  if (session.customAvatar) store.setCustomAvatar(session.customAvatar);
  socket.emit(
    "room:join",
    {
      roomCode: session.roomCode,
      name: session.name,
      avatar: session.avatar,
      color: session.color,
      isSpectator: session.isSpectator,
      customAvatar: session.customAvatar,
    },
    (res) => {
      clearTimeout(safety);
      setPendingRejoin(null);
      store.setRejoining(false);
      if (res.ok && res.playerId) {
        store.setMeId(res.playerId);
        console.log(`[session] rejoin OK (${reason})`);
        saveSession({ ...session, savedAt: Date.now() });
      } else {
        console.log(`[session] rejoin failed: ${res.error}`);
        clearSession();
        store.setRoom(null);
        store.setView("home");
        if (typeof window !== "undefined") {
          import("sonner").then(({ toast }) =>
            toast.info("Your previous room is no longer available.")
          );
        }
      }
    }
  );
}

export function useGameSocket() {
  const socketRef = useRef<GameSocket | null>(null);
  const store = useGameStore;

  useEffect(() => {
    primeAudio();
    const socket = getSocket();
    socketRef.current = socket;

    store.getState().setConnecting(true);

    const onConnect = () => {
      const isReconnect = hasConnectedBefore;
      hasConnectedBefore = true;
      store.getState().setConnected(true);
      store.getState().setConnecting(false);
      // Auto-rejoin on initial connect AND on reconnect after a drop.
      // (Socket.io gives us a new id on reconnect; the server's grace window
      // + name-match rejoin logic restores our seat.)
      attemptAutoRejoin(isReconnect ? "reconnect" : "init");
    };
    const onDisconnect = () => {
      store.getState().setConnected(false);
      store.getState().setConnecting(true);
    };
    const onConnectError = () => {
      store.getState().setConnecting(false);
    };

    const onRoomState = ({ room }: { room: any }) => {
      // The server always sends currentWord: null in room state (to hide it
      // from guessers). But on round-end/game-end we need the actual word to
      // display in the overlay. Preserve it if we already received it via
      // game:round-end and the server is now sending a round-end/game-end state.
      const prev = store.getState().room;
      const preserveWord =
        prev?.currentWord &&
        (room.stage === "round-end" || room.stage === "game-end") &&
        room.currentWord === null;
      store.getState().setRoom(
        preserveWord ? { ...room, currentWord: prev!.currentWord } : room
      );
      if (room.stage === "lobby") store.getState().setView("lobby");
      else if (["choosing", "drawing", "round-end", "game-end"].includes(room.stage))
        store.getState().setView("play");
    };
    const onPlayerJoined = ({ player }: any) => {
      const r = store.getState().room;
      if (r) store.getState().setRoom({ ...r, players: [...r.players, player] });
      sfx.join();
    };
    const onPlayerLeft = ({ playerId }: any) => {
      const r = store.getState().room;
      if (r) store.getState().setRoom({ ...r, players: r.players.filter((p) => p.id !== playerId) });
      sfx.leave();
    };
    const onSettingsUpdated = ({ settings }: any) => {
      const r = store.getState().room;
      if (r) store.getState().setRoom({ ...r, settings });
    };
    const onError = ({ message }: any) => {
      if (typeof window !== "undefined") {
        import("sonner").then(({ toast }) => toast.error(message));
      }
    };
    const onPromoteRequest = ({ needed }: { needed: "drawer" | "guesser" }) => {
      if (typeof window !== "undefined") {
        import("sonner").then(({ toast }) =>
          toast.info(`A ${needed} is needed! Spectators can volunteer to join.`)
        );
      }
    };
    const onYourTurn = ({ wordChoices }: any) => {
      store.getState().setWordChoices(wordChoices);
      sfx.choose();
    };
    const onRoundStart = ({ round, drawerId, drawTime }: any) => {
      const r = store.getState().room;
      if (r)
        store.getState().setRoom({
          ...r,
          stage: "choosing",
          currentRound: round,
          currentDrawerId: drawerId,
          timeLeft: drawTime,
          currentWord: null,
          wordHint: "",
          players: r.players.map((p) => ({ ...p, guessedThisRound: false })),
        });
      store.getState().setView("play");
      sfx.start();
    };
    const onWordChosen = ({ wordHint, wordLength }: any) => {
      const r = store.getState().room;
      if (r) store.getState().setRoom({ ...r, stage: "drawing", wordHint });
    };
    const onYourWord = ({ word }: any) => {
      store.getState().setMyWord(word);
      const r = store.getState().room;
      if (r) store.getState().setRoom({ ...r, currentWord: word });
    };
    const onTimer = ({ timeLeft }: any) => {
      const r = store.getState().room;
      if (r) store.getState().setRoom({ ...r, timeLeft });
      if (timeLeft <= 5 && timeLeft > 0) sfx.tick();
    };
    const onHint = ({ wordHint }: any) => {
      const r = store.getState().room;
      if (r) store.getState().setRoom({ ...r, wordHint });
    };
    const onChatMessage = ({ message }: any) => {
      store.getState().appendChat(message);
      if (message.type === "correct") sfx.correct();
      else if (message.type === "close") sfx.close();
      else if (message.type === "system") {
        /* no sound for system */
      }
    };
    const onPlayerGuessed = ({ playerId, points, drawerBonus }: any) => {
      const r = store.getState().room;
      if (r)
        store.getState().setRoom({
          ...r,
          players: r.players.map((p) =>
            p.id === playerId
              ? { ...p, guessedThisRound: true, score: p.score + points }
              : p.id === r.currentDrawerId
              ? { ...p, score: p.score + drawerBonus }
              : p
          ),
        });
    };
    const onRoundEnd = ({ word, scores, galleryItem }: any) => {
      const r = store.getState().room;
      if (r) {
        const players = r.players.map((p) => ({
          ...p,
          score: (scores[p.id] ?? p.score),
        }));
        const gallery = galleryItem ? [...r.gallery, galleryItem] : r.gallery;
        store.getState().setRoom({ ...r, stage: "round-end", currentWord: word, players, gallery });
      }
      store.getState().setMyWord(null);
      store.getState().setWordChoices(null);
      sfx.roundEnd();
    };
    const onGameEnd = ({ finalScores }: any) => {
      const r = store.getState().room;
      if (r) {
        const players = r.players.map((p) => ({ ...p, score: finalScores[p.id] ?? p.score }));
        store.getState().setRoom({ ...r, stage: "game-end", players });
      }
      store.getState().setFinalScores(finalScores);
      sfx.gameEnd();
    };
    const onReactionShow = ({ reaction }: any) => {
      store.getState().addReaction(reaction.emoji, reaction.x);
      sfx.reaction();
    };
    const onChatTyping = ({ playerId, name }: any) => {
      // Update typing indicator in store
      const r = useGameStore.getState().room;
      if (r) {
        const typing = r.typing ?? [];
        // Add if not already in list
        if (!typing.find((t: any) => t.playerId === playerId)) {
          useGameStore.getState().patchRoom({ typing: [...typing, { playerId, name, ts: Date.now() }] });
        }
      }
      // Auto-clear after 3s
      setTimeout(() => {
        const r2 = useGameStore.getState().room;
        if (r2 && r2.typing) {
          useGameStore.getState().patchRoom({ typing: r2.typing.filter((t: any) => t.playerId !== playerId) });
        }
      }, 3000);
    };
    const onChatReaction = ({ messageId, emoji, playerId }: any) => {
      // Could update message reactions in store — for now just log
      console.log("[chat] reaction:", emoji, "on", messageId, "by", playerId);
    };
    const onQueenArrival = ({ name, avatar }: any) => {
      store.getState().setQueenArrival({ name, avatar, ts: Date.now() });
      sfx.gameEnd(); // fanfare
      // Auto-clear after 5s
      setTimeout(() => store.getState().setQueenArrival(null), 5000);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    // ── Race fix: if the socket is ALREADY connected (e.g. fast localhost
    // link or HMR reuse), the 'connect' event fired before we registered
    // the listener. Manually trigger onConnect so the store updates.
    if (socket.connected) onConnect();
    socket.on("room:state", onRoomState);
    socket.on("room:player-joined", onPlayerJoined);
    socket.on("room:player-left", onPlayerLeft);
    socket.on("room:settings-updated", onSettingsUpdated);
    socket.on("room:error", onError);
    socket.on("room:promote-request", onPromoteRequest);
    socket.on("game:your-turn", onYourTurn);
    socket.on("game:round-start", onRoundStart);
    socket.on("game:word-chosen", onWordChosen);
    socket.on("game:your-word", onYourWord);
    socket.on("game:timer", onTimer);
    socket.on("game:hint", onHint);
    socket.on("chat:message", onChatMessage);
    socket.on("game:player-guessed", onPlayerGuessed);
    socket.on("game:round-end", onRoundEnd);
    socket.on("game:game-end", onGameEnd);
    socket.on("reaction:show", onReactionShow);
    socket.on("chat:typing", onChatTyping);
    socket.on("chat:reaction", onChatReaction);
    socket.on("game:queen-arrival", onQueenArrival);

    // drawing events are consumed by the canvas component directly via getSocket(),
    // not here, to avoid re-renders.

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("room:state", onRoomState);
      socket.off("room:player-joined", onPlayerJoined);
      socket.off("room:player-left", onPlayerLeft);
      socket.off("room:settings-updated", onSettingsUpdated);
      socket.off("room:error", onError);
      socket.off("room:promote-request", onPromoteRequest);
      socket.off("game:your-turn", onYourTurn);
      socket.off("game:round-start", onRoundStart);
      socket.off("game:word-chosen", onWordChosen);
      socket.off("game:your-word", onYourWord);
      socket.off("game:timer", onTimer);
      socket.off("game:hint", onHint);
      socket.off("chat:message", onChatMessage);
      socket.off("game:player-guessed", onPlayerGuessed);
      socket.off("game:round-end", onRoundEnd);
      socket.off("game:game-end", onGameEnd);
      socket.off("reaction:show", onReactionShow);
      socket.off("chat:typing", onChatTyping);
      socket.off("chat:reaction", onChatReaction);
      socket.off("game:queen-arrival", onQueenArrival);
      // NOTE: do NOT disconnect the singleton — we reuse it across views.
    };
  }, [store]);
}
