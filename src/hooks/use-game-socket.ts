"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/lib/game/types";
import { useGameStore } from "@/lib/game/store";
import { sfx, primeAudio } from "@/lib/game/sound";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketSingleton: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (!socketSingleton) {
    const isSandbox =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.search.includes("XTransformPort") ||
        window.location.port === "81");

    // In production: connect to NEXT_PUBLIC_GAME_SERVER_URL if set.
    // If not set, fall back to same-origin (works if game server is behind
    // the same reverse proxy / same Render service).
    const prodWsUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL || "";

    const url = isSandbox
      ? "/?XTransformPort=3003"
      : prodWsUrl;  // empty string = same origin

    // Log a warning if no game server URL is configured (helps debugging)
    if (!isSandbox && !prodWsUrl && typeof window !== "undefined") {
      console.warn(
        "[DoodleDash] NEXT_PUBLIC_GAME_SERVER_URL not set. " +
        "Connecting to same origin. If the game server is on a separate " +
        "service, set NEXT_PUBLIC_GAME_SERVER_URL to its URL."
      );
    }

    socketSingleton = io(url, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
      timeout: 12000,
    });
  }
  return socketSingleton;
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
      store.getState().setConnected(true);
      store.getState().setConnecting(false);
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
    const onQueenArrival = ({ name, avatar }: any) => {
      store.getState().setQueenArrival({ name, avatar, ts: Date.now() });
      sfx.gameEnd(); // fanfare
      // Auto-clear after 5s
      setTimeout(() => store.getState().setQueenArrival(null), 5000);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
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
      socket.off("game:queen-arrival", onQueenArrival);
      // NOTE: do NOT disconnect the singleton — we reuse it across views.
    };
  }, [store]);
}
