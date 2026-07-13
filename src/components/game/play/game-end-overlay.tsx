"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Home, LogOut, Palette, RefreshCw, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useGameStore, selectIsHost } from "@/lib/game/store";
import { getSocket } from "@/hooks/use-game-socket";
import { sfx } from "@/lib/game/sound";
import type { Player } from "@/lib/game/types";
import { GalleryDialog } from "./gallery-dialog";
import { updateProfileAfterGame } from "@/lib/game/profile";

// Stable selector for my player id
const selectMeId = (s: ReturnType<typeof useGameStore.getState>) => s.meId;

// Festive confetti palette — theme-agnostic
const CONFETTI_COLORS = [
  "#ff7a59",
  "#ffd700",
  "#10b981",
  "#06b6d4",
  "#ec4899",
  "#8b5cf6",
];

const CONFETTI_SHAPES = ["rect", "circle"] as const;

function Confetti() {
  // Deterministic-ish per render with useMemo so it doesn't regenerate on rerender
  const pieces = React.useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const left = Math.random() * 100;
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      const duration = 2 + Math.random() * 2; // 2-4s
      const delay = Math.random() * 3; // staggered
      const size = 6 + Math.random() * 8;
      const shape = CONFETTI_SHAPES[i % CONFETTI_SHAPES.length];
      const drift = (Math.random() - 0.5) * 80;
      return { id: i, left, color, duration, delay, size, shape, drift };
    });
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      aria-hidden
    >
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece absolute"
          style={{
            left: `${p.left}%`,
            top: "-5vh",
            width: p.shape === "rect" ? p.size : p.size,
            height: p.shape === "rect" ? p.size * 1.6 : p.size,
            background: p.color,
            borderRadius: p.shape === "circle" ? "999px" : "2px",
            // Override the CSS `forwards` to make confetti continuous.
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            animationIterationCount: "infinite",
            animationTimingFunction: "linear",
            transform: `translateX(${p.drift}px)`,
          }}
        />
      ))}
    </div>
  );
}

function PodiumAvatar({
  player,
  size,
  rank,
}: {
  player: Player;
  size: number;
  rank: number;
}) {
  return (
    <div className="flex flex-col items-center">
      {rank === 1 && (
        <motion.div
          initial={{ y: -8, opacity: 0, rotate: -20 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ delay: 0.45, type: "spring", stiffness: 320, damping: 14 }}
          className="mb-1 text-2xl"
          aria-hidden
        >
          👑
        </motion.div>
      )}
      <div
        className="avatar-ring relative rounded-full"
        style={{ width: size + 6, height: size + 6, padding: 3 }}
      >
        <div
          className="flex items-center justify-center rounded-full bg-card"
          style={{ width: size, height: size, fontSize: size * 0.55 }}
        >
          {player.avatar}
        </div>
      </div>
    </div>
  );
}

function PodiumColumn({
  player,
  rank,
  heightClass,
  avatarSize,
  delay,
}: {
  player: Player;
  rank: number;
  heightClass: string;
  avatarSize: number;
  delay: number;
}) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 22 }}
      className="flex flex-1 flex-col items-center justify-end"
    >
      <PodiumAvatar player={player} size={avatarSize} rank={rank} />
      <div className="mt-2 max-w-[120px] truncate text-center text-sm font-extrabold">
        {player.name}
      </div>
      <div className="text-base font-extrabold tabular-nums text-grad">
        {player.score}
      </div>
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: delay + 0.1, type: "spring", stiffness: 200, damping: 20 }}
        className={cn(
          "mt-2 flex w-full origin-bottom items-start justify-center rounded-t-2xl bg-grad pt-2 text-xs font-black text-primary-foreground shadow-float",
          heightClass
        )}
      >
        <span aria-hidden className="text-lg">
          {medal}
        </span>
      </motion.div>
    </motion.div>
  );
}

function StandingsRow({
  player,
  rank,
  isMe,
}: {
  player: Player;
  rank: number;
  isMe: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5",
        isMe ? "bg-accent-soft/70" : "hover:bg-muted/50"
      )}
    >
      <span className="w-5 text-center text-xs font-bold tabular-nums text-muted-foreground">
        {rank}
      </span>
      <div
        className="avatar-ring-static shrink-0 rounded-full"
        style={{ width: 28, height: 28, padding: 2 }}
      >
        <div className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-card text-sm">
          {player.avatar}
        </div>
      </div>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          isMe ? "font-extrabold" : "font-semibold"
        )}
      >
        {player.name}
        {isMe && (
          <span className="ml-1.5 rounded bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            You
          </span>
        )}
      </span>
      <span className="text-sm font-extrabold tabular-nums">{player.score}</span>
    </div>
  );
}

export function GameEndOverlay() {
  const room = useGameStore((s) => s.room);
  const isHost = useGameStore(selectIsHost);
  const meId = useGameStore(selectMeId);
  const setView = useGameStore((s) => s.setView);
  const reset = useGameStore((s) => s.reset);

  const stage = room?.stage;
  const show = stage === "game-end";

  const [galleryOpen, setGalleryOpen] = React.useState(false);
  const submittedRef = React.useRef(false);

  const sortedPlayers = React.useMemo<Player[]>(() => {
    if (!room) return [];
    return [...room.players].sort((a, b) => b.score - a.score);
  }, [room]);

  // Update local profile stats on game-end (everyone does this for themselves).
  // No global leaderboard submission — rankings are in-game only.
  React.useEffect(() => {
    if (!show || !room) return;
    if (submittedRef.current) return;
    submittedRef.current = true;
    if (meId) {
      try {
        updateProfileAfterGame(
          Object.fromEntries(room.players.map((p) => [p.id, p.score])),
          meId,
          room.players,
          room.gallery
        );
      } catch { /* ignore */ }
    }
  }, [show, room, meId]);

  const top3 = sortedPlayers.slice(0, 3);
  const rest = sortedPlayers.slice(3);
  const winner = top3[0];

  function handlePlayAgain() {
    sfx.click();
    // Host can request a restart; server may no-op gracefully if unsupported.
    getSocket().emit("room:start");
  }

  function handleLeave() {
    sfx.click();
    getSocket().emit("room:leave");
    reset();
    setView("home");
  }

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 backdrop-blur-md sm:p-6"
            aria-modal="true"
            role="dialog"
          >
            <Confetti />

            <Card className="animate-pop-in shadow-float relative z-10 my-auto w-full max-w-2xl gap-0 overflow-hidden rounded-3xl p-0">
              {/* Header */}
              <div className="bg-grad relative px-6 py-6 text-center text-primary-foreground">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 280, damping: 16 }}
                  className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-white/20"
                >
                  <Trophy className="h-6 w-6" />
                </motion.div>
                <h2 className="text-3xl font-extrabold tracking-tight">Game Over!</h2>
                {winner && (
                  <p className="mt-1 text-sm font-medium opacity-95">
                    {winner.avatar} <span className="font-bold">{winner.name}</span>{" "}
                    takes the crown with {winner.score} pts!
                  </p>
                )}
              </div>

              {/* Podium */}
              <div className="px-4 pt-6 sm:px-6">
                {top3.length > 0 && (
                  <div className="mx-auto flex max-w-md items-end justify-center gap-2 sm:gap-4">
                    {/* 2nd (left) */}
                    {top3[1] && (
                      <PodiumColumn
                        player={top3[1]}
                        rank={2}
                        heightClass="h-20"
                        avatarSize={44}
                        delay={0.35}
                      />
                    )}
                    {/* 1st (center, tallest) */}
                    {top3[0] && (
                      <PodiumColumn
                        player={top3[0]}
                        rank={1}
                        heightClass="h-28"
                        avatarSize={64}
                        delay={0.2}
                      />
                    )}
                    {/* 3rd (right) */}
                    {top3[2] && (
                      <PodiumColumn
                        player={top3[2]}
                        rank={3}
                        heightClass="h-16"
                        avatarSize={40}
                        delay={0.5}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Standings */}
              <div className="px-4 py-5 sm:px-6">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-bold">Final Standings</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {sortedPlayers.length} players
                  </Badge>
                </div>
                <ScrollArea className="scroll-soft max-h-52 pr-1">
                  <div className="flex flex-col gap-1">
                    {top3.map((p, i) => (
                      <StandingsRow
                        key={p.id}
                        player={p}
                        rank={i + 1}
                        isMe={p.id === meId}
                      />
                    ))}
                    {rest.map((p, i) => (
                      <StandingsRow
                        key={p.id}
                        player={p}
                        rank={i + 4}
                        isMe={p.id === meId}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border/60 px-4 py-4 sm:px-6">
                <Button
                  onClick={() => {
                    sfx.click();
                    setGalleryOpen(true);
                  }}
                  variant="secondary"
                  className="rounded-xl"
                >
                  <Palette className="h-4 w-4" />
                  View Gallery
                </Button>
                {isHost && (
                  <Button
                    onClick={handlePlayAgain}
                    className="rounded-xl"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Play Again
                  </Button>
                )}
                <Button
                  onClick={handleLeave}
                  variant={isHost ? "outline" : "default"}
                  className="rounded-xl"
                >
                  {isHost ? <Home className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                  {isHost ? "New Room" : "Leave"}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <GalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        gallery={room?.gallery ?? []}
      />
    </>
  );
}

export default GameEndOverlay;
