"use client";

import { Sparkles, WifiOff } from "lucide-react";
import { motion } from "framer-motion";
import { useGameStore } from "@/lib/game/store";
import { useTheme } from "@/components/game/theme-provider";
import { sfx } from "@/lib/game/sound";
import type { ThemeName } from "@/lib/game/types";
import { PlayersGrid } from "./players-grid";
import { SettingsPanel } from "./settings-panel";
import { ShareCard } from "./share-card";
import { LobbyChat } from "./lobby-chat";
import { StartButton } from "./start-button";
import { LeaveButton } from "./leave-button";
import { cn } from "@/lib/utils";

const THEMES: { value: ThemeName; label: string; emoji: string }[] = [
  { value: "peach", label: "Peach", emoji: "🍑" },
  { value: "mint", label: "Mint", emoji: "🌿" },
  { value: "sky", label: "Sky", emoji: "💧" },
  { value: "lavender", label: "Lavender", emoji: "💜" },
];

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center gap-0.5 rounded-full border bg-card/70 p-1 shadow-soft">
      {THEMES.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => {
            sfx.pop();
            setTheme(t.value);
          }}
          aria-label={`Switch to ${t.label} theme`}
          aria-pressed={theme === t.value}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-sm transition-all hover:scale-110",
            theme === t.value && "bg-primary/15 ring-2 ring-primary/40"
          )}
        >
          <span aria-hidden>{t.emoji}</span>
        </button>
      ))}
    </div>
  );
}

export function LobbyScreen() {
  const room = useGameStore((s) => s.room);
  const connected = useGameStore((s) => s.connected);

  if (!room) return null;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="glass sticky top-0 z-30 border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
          {/* Left: logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-grad text-white shadow-soft">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">Doodle Dash</span>
          </div>

          {/* Center: room code (desktop) */}
          <div className="hidden items-center gap-2 rounded-full border bg-card/70 px-4 py-1.5 shadow-soft md:flex">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Room
            </span>
            <span className="text-grad font-mono text-base font-extrabold tracking-[0.3em]">
              {room.code}
            </span>
          </div>

          {/* Right: theme + leave */}
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LeaveButton />
          </div>
        </div>
      </header>

      {/* Reconnecting banner */}
      {!connected && (
        <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900">
          <WifiOff className="h-4 w-4" />
          Reconnecting...
        </div>
      )}

      {/* Main */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col items-center gap-1 text-center"
        >
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {room.name || "Waiting Room"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Room code:{" "}
            <span className="font-mono text-base font-bold text-foreground">{room.code}</span>
          </p>
        </motion.div>

        {/* Hint if alone */}
        {room.players.length < 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 rounded-2xl border border-dashed border-primary/40 bg-[var(--accent-soft)]/40 px-4 py-3 text-center text-sm font-medium text-foreground"
          >
            👋 Share the code with a friend to start!
          </motion.div>
        )}

        {/* 2-column layout on desktop */}
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Left: players + start */}
          <div className="flex flex-col gap-4">
            <PlayersGrid />
            <StartButton />
          </div>
          {/* Right: settings + share + chat */}
          <div className="flex flex-col gap-4">
            <SettingsPanel />
            <ShareCard />
            <LobbyChat />
          </div>
        </div>
      </main>
    </div>
  );
}

export default LobbyScreen;
