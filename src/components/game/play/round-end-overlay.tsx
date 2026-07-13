"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/lib/game/store";
import type { Player } from "@/lib/game/types";

function MiniAvatar({
  player,
  size = 32,
}: {
  player: Player;
  size?: number;
}) {
  return (
    <div
      className="avatar-ring-static relative shrink-0 rounded-full"
      style={{ width: size + 4, height: size + 4, padding: 2 }}
    >
      <div
        className="flex items-center justify-center rounded-full bg-card"
        style={{ width: size, height: size, fontSize: size * 0.55 }}
      >
        {player.avatar}
      </div>
    </div>
  );
}

function PodiumRow({ player, rank }: { player: Player; rank: number }) {
  const tone =
    rank === 1
      ? "👑"
      : rank === 2
        ? "🥈"
        : rank === 3
          ? "🥉"
          : "";
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + rank * 0.06, type: "spring", stiffness: 280, damping: 24 }}
      className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-surface-2/60 px-3 py-2"
    >
      <span className="w-5 text-center text-sm font-bold text-muted-foreground tabular-nums">
        {rank}
      </span>
      <MiniAvatar player={player} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold">{player.name}</span>
          <span aria-hidden>{tone}</span>
        </div>
      </div>
      <span className="text-base font-extrabold tabular-nums text-grad">
        {player.score}
      </span>
    </motion.div>
  );
}

export function RoundEndOverlay() {
  const room = useGameStore((s) => s.room);
  const stage = room?.stage;

  const show = stage === "round-end";

  const sortedPlayers = React.useMemo<Player[]>(() => {
    if (!room) return [];
    return [...room.players].sort((a, b) => b.score - a.score);
  }, [room]);

  const top3 = sortedPlayers.slice(0, 3);
  const word = room?.currentWord ?? "";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm"
          aria-modal="true"
          role="dialog"
        >
          <Card className="animate-pop-in shadow-float my-auto w-full max-w-md gap-0 overflow-hidden rounded-3xl p-0">
            {/* Header */}
            <div className="bg-grad relative px-6 py-5 text-center text-primary-foreground">
              <div className="mx-auto mb-1 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest opacity-90">
                <Sparkles className="h-3.5 w-3.5" />
                Round {room?.currentRound ?? 0} of {room?.totalRounds ?? 0}
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Round Complete!
              </h2>
            </div>

            {/* The word */}
            <div className="px-6 pt-5 text-center">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                The word was
              </div>
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.12, type: "spring", stiffness: 320, damping: 18 }}
                className="mx-auto inline-flex items-center justify-center gap-2 rounded-full bg-grad px-6 py-2 shadow-soft"
              >
                <span className="text-2xl font-extrabold tracking-wide text-primary-foreground">
                  {word || "—"}
                </span>
              </motion.div>
            </div>

            {/* Standings */}
            <div className="px-5 py-5">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-bold">Current Standings</span>
                <Badge variant="secondary" className="text-[10px]">
                  Top {top3.length}
                </Badge>
              </div>
              <div className="flex flex-col gap-1.5">
                {top3.map((p, i) => (
                  <PodiumRow key={p.id} player={p} rank={i + 1} />
                ))}
                {top3.length === 0 && (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    No scores yet.
                  </div>
                )}
              </div>
            </div>

            {/* Footer hint */}
            <div
              className={cn(
                "border-t border-border/60 px-6 py-3 text-center text-xs text-muted-foreground"
              )}
            >
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="inline-flex items-center gap-1.5"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                Get ready for the next round…
              </motion.span>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default RoundEndOverlay;
