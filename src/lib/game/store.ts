"use client";

import { create } from "zustand";
import type {
  Room,
  Player,
  GameSettings,
  BrushType,
  ShapeType,
  ChatMessage,
  ReactionEmoji,
  Stroke,
  ShapeStroke,
  ThemeName,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";

export type View = "home" | "lobby" | "play";

interface GameState {
  // connection
  connected: boolean;
  connecting: boolean;
  rejoining: boolean; // true while attempting auto-rejoin after reload/reconnect
  // identity
  meId: string | null;
  name: string;
  avatar: string;
  color: string;
  // room
  room: Room | null;
  view: View;
  // play-specific transient UI
  wordChoices: string[] | null; // for drawer
  myWord: string | null; // full word if I'm drawing
  gallery: Room["gallery"];
  finalScores: Record<string, number> | null;
  // tool state (local)
  brush: BrushType;
  brushSize: number;
  brushColor: string;
  shape: ShapeType;
  toolMode: "brush" | "shape" | "fill";
  theme: ThemeName;
  // reactions floating on canvas
  floatingReactions: { id: string; emoji: ReactionEmoji; x: number }[];

  // ---- New feature state (client-side, persisted to localStorage) ----
  symmetry: 0 | 1 | 2 | 4;
  paperTexture: "plain" | "dots" | "grid" | "parchment" | "dark";
  brushSounds: boolean;
  cvdMode: "off" | "deutan" | "protan" | "tritan";
  highContrast: boolean;
  avatarFrame: string;
  nameColor: string | null;
  canvasBorder: string;
  customAvatar: string | null;
  profileStats: { games: number; wins: number; bestScore: number; favoriteWord: string | null };
  buddies: { code: string; name: string; avatar: string }[];
  queenArrival: { name: string; avatar: string; ts: number } | null;

  // actions (delegated to socket hook via setSocket ready)
  setConnected: (v: boolean) => void;
  setConnecting: (v: boolean) => void;
  setRejoining: (v: boolean) => void;
  setMeId: (id: string | null) => void;
  setIdentity: (p: { name: string; avatar: string; color: string }) => void;
  setRoom: (r: Room | null) => void;
  patchRoom: (p: Partial<Room>) => void;
  setView: (v: View) => void;
  setWordChoices: (w: string[] | null) => void;
  setMyWord: (w: string | null) => void;
  setFinalScores: (s: Record<string, number> | null) => void;
  appendChat: (m: ChatMessage) => void;
  addReaction: (emoji: ReactionEmoji, x: number) => void;
  removeReaction: (id: string) => void;
  setTool: (t: BrushType) => void;
  setShape: (s: ShapeType) => void;
  setToolMode: (m: "brush" | "shape" | "fill") => void;
  setBrushSize: (n: number) => void;
  setBrushColor: (c: string) => void;
  setTheme: (t: ThemeName) => void;
  setSymmetry: (s: 0 | 1 | 2 | 4) => void;
  setPaperTexture: (t: "plain" | "dots" | "grid" | "parchment" | "dark") => void;
  setBrushSounds: (v: boolean) => void;
  setCvdMode: (m: "off" | "deutan" | "protan" | "tritan") => void;
  setHighContrast: (v: boolean) => void;
  setAvatarFrame: (f: string) => void;
  setNameColor: (c: string | null) => void;
  setCanvasBorder: (b: string) => void;
  setCustomAvatar: (d: string | null) => void;
  addBuddy: (b: { code: string; name: string; avatar: string }) => void;
  removeBuddy: (code: string) => void;
  setQueenArrival: (q: { name: string; avatar: string; ts: number } | null) => void;
  reset: () => void;
}

const initialRoom: Room = {
  code: "",
  name: "",
  hostId: "",
  players: [],
  settings: DEFAULT_SETTINGS,
  stage: "lobby",
  currentRound: 0,
  totalRounds: 0,
  currentDrawerId: null,
  currentWord: null,
  wordHint: "",
  timeLeft: 0,
  paused: false,
  chat: [],
  gallery: [],
};

export const useGameStore = create<GameState>((set) => ({
  connected: false,
  connecting: false,
  rejoining: false,
  meId: null,
  name: "",
  avatar: "🐱",
  color: "#ff7a59",
  room: null,
  view: "home",
  wordChoices: null,
  myWord: null,
  gallery: [],
  finalScores: null,
  brush: "pen",
  brushSize: 8,
  brushColor: "#000000",
  shape: "line",
  toolMode: "brush",
  theme: "peach",
  floatingReactions: [],

  // new feature defaults
  symmetry: 0,
  paperTexture: "plain",
  brushSounds: false,
  cvdMode: "off",
  highContrast: false,
  avatarFrame: "none",
  nameColor: null,
  canvasBorder: "none",
  customAvatar: null,
  profileStats: { games: 0, wins: 0, bestScore: 0, favoriteWord: null },
  buddies: [],
  queenArrival: null,

  setConnected: (v) => set({ connected: v }),
  setConnecting: (v) => set({ connecting: v }),
  setRejoining: (v) => set({ rejoining: v }),
  setMeId: (id) => set({ meId: id }),
  setIdentity: (p) => set({ name: p.name, avatar: p.avatar, color: p.color }),
  setRoom: (r) => set({ room: r }),
  patchRoom: (p) => set((s) => (s.room ? { room: { ...s.room, ...p } } : {})),
  setView: (v) => set({ view: v }),
  setWordChoices: (w) => set({ wordChoices: w }),
  setMyWord: (w) => set({ myWord: w }),
  setFinalScores: (s) => set({ finalScores: s }),
  appendChat: (m) =>
    set((s) =>
      s.room ? { room: { ...s.room, chat: [...s.room.chat.slice(-199), m] } } : {}
    ),
  addReaction: (emoji, x) =>
    set((s) => {
      const id = Math.random().toString(36).slice(2);
      const next = [...s.floatingReactions, { id, emoji, x }];
      setTimeout(() => useGameStore.getState().removeReaction(id), 2300);
      return { floatingReactions: next.slice(-24) };
    }),
  removeReaction: (id) =>
    set((s) => ({ floatingReactions: s.floatingReactions.filter((r) => r.id !== id) })),
  setTool: (t) => set({ brush: t }),
  setShape: (sh) => set({ shape: sh }),
  setToolMode: (m) => set({ toolMode: m }),
  setBrushSize: (n) => set({ brushSize: n }),
  setBrushColor: (c) => set({ brushColor: c }),
  setTheme: (t) => set({ theme: t }),
  setSymmetry: (sym) => set({ symmetry: sym }),
  setPaperTexture: (t) => set({ paperTexture: t }),
  setBrushSounds: (v) => set({ brushSounds: v }),
  setCvdMode: (m) => set({ cvdMode: m }),
  setHighContrast: (v) => set({ highContrast: v }),
  setAvatarFrame: (f) => set({ avatarFrame: f }),
  setNameColor: (c) => set({ nameColor: c }),
  setCanvasBorder: (b) => set({ canvasBorder: b }),
  setCustomAvatar: (d) => set({ customAvatar: d }),
  addBuddy: (b) => set((s) => ({ buddies: [...s.buddies, b] })),
  removeBuddy: (code) => set((s) => ({ buddies: s.buddies.filter((b) => b.code !== code) })),
  setQueenArrival: (q) => set({ queenArrival: q }),
  reset: () =>
    set({
      room: null,
      view: "home",
      wordChoices: null,
      myWord: null,
      finalScores: null,
      gallery: [],
      floatingReactions: [],
    }),
}));

// selector helpers
export const selectMe = (s: GameState): Player | null =>
  s.room ? s.room.players.find((p) => p.id === s.meId) ?? null : null;
export const selectIsDrawer = (s: GameState): boolean =>
  !!s.room && !!s.meId && s.room.currentDrawerId === s.meId;
export const selectIsHost = (s: GameState): boolean =>
  !!s.room && !!s.meId && s.room.hostId === s.meId;
