"use client";

import { CanvasBoard } from "./canvas-board";
import { DrawingToolbar } from "./drawing-toolbar";
import { WordBar } from "./word-bar";
import { ReactionsOverlay, ReactionBar } from "./reactions-overlay";
import { Scoreboard } from "./scoreboard";
import { ChatPanel } from "./chat-panel";
import { RoundEndOverlay } from "./round-end-overlay";
import { GameEndOverlay } from "./game-end-overlay";
import { WordChoiceOverlay } from "./word-choice-overlay";
import { ThemeSwitcher } from "@/components/game/home/theme-switcher";
import { LeaveButton } from "@/components/game/lobby/leave-button";
import { useGameStore, selectIsDrawer, selectMe } from "@/lib/game/store";
import { getSocket } from "@/hooks/use-game-socket";
import { sfx } from "@/lib/game/sound";
import { Logo } from "@/components/game/logo";
import { MobileChatOrb } from "./mobile-chat-orb";
import { RotateOverlay } from "./rotate-overlay";
import { VerticalToolbar } from "./vertical-toolbar";
import { SidePanel } from "./side-panel";
import { useOrientation } from "@/hooks/use-orientation";

function useBorderClass() {
  const canvasBorder = useGameStore((s) => s.canvasBorder);
  return canvasBorder === "solid" ? "border-2 border-foreground"
    : canvasBorder === "dashed" ? "border-2 border-dashed border-foreground"
    : canvasBorder === "double" ? "border-4 border-double border-foreground"
    : canvasBorder === "glow" ? "border-2 border-primary shadow-[0_0_20px_var(--accent)]"
    : canvasBorder === "gradient" ? "border-4 border-transparent [border-image:linear-gradient(135deg,var(--grad-from),var(--grad-to))_1]"
    : "border";
}

function MobileLandscapeLayout() {
  const room = useGameStore((s) => s.room);
  const isDrawer = useGameStore(selectIsDrawer);
  const me = useGameStore(selectMe);
  const isSpectator = !!me?.isSpectator;
  const borderClass = useBorderClass();

  if (!room) return null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Compact top bar */}
      <header className="glass z-30 flex shrink-0 items-center justify-between border-b px-2 py-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <Logo compact />
          <span className="text-[10px] font-mono font-semibold text-muted-foreground">{room.code}</span>
          {room.paused && <span className="text-[10px] font-bold text-amber-600">⏸</span>}
          {isSpectator && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">👁</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ThemeSwitcher compact />
          <LeaveButton />
        </div>
      </header>

      {/* 3-column body */}
      <div className="flex min-h-0 flex-1 gap-1 p-1">
        {/* Left: Canvas (flex-1, gets ~60-65%) */}
        <main className="relative flex min-w-0 flex-1 flex-col">
          {/* Word bar overlaid as glass pill */}
          <div className="absolute inset-x-2 top-1 z-20">
            <WordBar className="!rounded-full !py-1 !px-2 !shadow-float backdrop-blur-lg bg-card/80 !border-border/40 text-xs [&_*]:!text-xs [&_.font-mono]:!text-[10px]" />
          </div>
          <div className={borderClass + " relative min-h-0 flex-1 overflow-hidden rounded-xl"}>
            <CanvasBoard className="h-full w-full" />
            <ReactionsOverlay className="rounded-xl" />
            <ReactionBar className="absolute bottom-2 right-2 z-10" />
          </div>
        </main>

        {/* Middle column (~80px): role-dependent */}
        <div className="w-[80px] shrink-0">
          {isDrawer && !isSpectator ? (
            <VerticalToolbar className="h-full" />
          ) : (
            <div className="h-full overflow-y-auto scroll-soft rounded-2xl border bg-card/95 shadow-soft">
              <Scoreboard />
            </div>
          )}
        </div>

        {/* Right column: chat panel with toggle for drawer */}
        <div className="w-[200px] shrink-0">
          <SidePanel className="h-full" />
        </div>
      </div>

      {/* Spectator volunteer prompt */}
      {isSpectator && room.paused && (
        <div className="absolute bottom-2 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-accent bg-accent-soft px-3 py-2 text-center shadow-float">
          <button
            onClick={() => { getSocket().emit("spectator:volunteer"); sfx.click(); }}
            className="rounded-lg bg-grad px-3 py-1 text-xs font-bold text-white"
          >
            Join as player
          </button>
        </div>
      )}

      <WordChoiceOverlay />
      <RoundEndOverlay />
      <GameEndOverlay />
      <RotateOverlay />
    </div>
  );
}

function DesktopLayout() {
  const room = useGameStore((s) => s.room);
  const isDrawer = useGameStore(selectIsDrawer);
  const me = useGameStore(selectMe);
  const isSpectator = !!me?.isSpectator;
  const borderClass = useBorderClass();

  if (!room) return null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Top bar */}
      <header className="glass z-30 flex shrink-0 items-center justify-between border-b px-2 py-1.5 sm:px-4 sm:py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Logo compact />
          <div className="hidden min-w-0 flex-col sm:flex">
            <span className="truncate text-sm font-bold leading-tight">{room.name || "Doodle Dash"}</span>
            <span className="text-[10px] leading-tight text-muted-foreground">
              Code <span className="font-mono font-semibold">{room.code}</span>
              {room.paused && <span className="ml-2 font-bold text-amber-600">⏸ Paused</span>}
            </span>
          </div>
          {isSpectator && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">👁 Spectating</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeSwitcher compact />
          <LeaveButton />
        </div>
      </header>

      {/* Word bar */}
      <div className="shrink-0 px-2 pt-2 sm:px-4">
        <WordBar />
      </div>

      {/* Pause banner */}
      {room.paused && (
        <div className="mx-2 mt-2 shrink-0 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm font-semibold text-amber-800 sm:mx-4">
          ⏸ Game paused — waiting for players to rejoin. Chat is still open!
        </div>
      )}

      {/* Spectator promotion prompt */}
      {isSpectator && room.paused && (
        <div className="mx-2 mt-2 shrink-0 rounded-xl border border-accent bg-accent-soft px-4 py-3 text-center sm:mx-4">
          <p className="mb-2 text-sm font-bold">A player is needed! Want to jump in?</p>
          <button
            onClick={() => { getSocket().emit("spectator:volunteer"); sfx.click(); }}
            className="rounded-xl bg-grad px-4 py-1.5 text-sm font-bold text-white shadow-soft"
          >
            Join as player
          </button>
        </div>
      )}

      {/* Main 3-column on desktop; stacked + tabs on mobile */}
      <div className="flex min-h-0 flex-1 gap-0.5 p-0.5 sm:gap-3 sm:p-3">
        {/* Left: scoreboard (desktop) */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <Scoreboard />
        </aside>

        {/* Center: canvas + toolbar + reactions */}
        <main className="flex min-w-0 flex-1 flex-col gap-1 sm:gap-2">
          <div className={borderClass + " relative min-h-0 flex-1 overflow-hidden rounded-2xl"}>
            <CanvasBoard className="h-full w-full" />
            <ReactionsOverlay className="rounded-2xl" />
            <ReactionBar className="absolute bottom-3 right-3 z-10" />
          </div>
          {isDrawer && !isSpectator && <DrawingToolbar />}
          {isSpectator && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-700">
              👁 You&apos;re spectating — sit back, watch, and drop reactions!
            </div>
          )}
        </main>

        {/* Right: chat (desktop) */}
        <aside className="hidden w-80 shrink-0 xl:block">
          <ChatPanel />
        </aside>

        {/* Mobile: floating chat orb + slide-up panel */}
        <MobileChatOrb />
      </div>

      {/* Overlays */}
      <WordChoiceOverlay />
      <RoundEndOverlay />
      <GameEndOverlay />
      <RotateOverlay />
    </div>
  );
}

export function PlayScreen() {
  const room = useGameStore((s) => s.room);
  const { isMobileLandscape } = useOrientation();

  if (!room) return null;

  return isMobileLandscape ? <MobileLandscapeLayout /> : <DesktopLayout />;
}

export default PlayScreen;
