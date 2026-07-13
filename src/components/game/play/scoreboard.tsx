"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Crown, Palette, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useGameStore, selectMe, selectIsHost } from "@/lib/game/store";
import type { Player } from "@/lib/game/types";

// ----------------------------------------------------------------------------
// Avatar with gradient ring. Uses CSS var-driven gradient so it adapts to all
// 4 themes. `pulse` enables the .animate-pulse-ring for the active drawer.
// ----------------------------------------------------------------------------
function PlayerAvatar({
  player,
  size = 36,
  pulse = false,
}: {
  player: Player;
  size?: number;
  pulse?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 rounded-full",
        pulse ? "avatar-ring animate-pulse-ring" : "avatar-ring-static"
      )}
      style={{ width: size + 4, height: size + 4, padding: 2 }}
      aria-hidden
    >
      <div
        className="flex items-center justify-center overflow-hidden rounded-full bg-card"
        style={{ width: size, height: size, fontSize: size * 0.55 }}
      >
        {player.customAvatar ? (
          <img src={player.customAvatar} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <span aria-hidden>{player.avatar}</span>
        )}
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const isTop = rank <= 3;
  const tone =
    rank === 1
      ? "text-amber-500"
      : rank === 2
        ? "text-slate-400"
        : rank === 3
          ? "text-orange-400"
          : "text-muted-foreground";
  return (
    <div
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold tabular-nums",
        isTop ? "bg-grad text-white shadow-soft" : "bg-muted text-muted-foreground"
      )}
    >
      {isTop ? <Trophy className={cn("h-3.5 w-3.5", tone)} /> : rank}
    </div>
  );
}

function ScoreRow({
  player,
  rank,
  isMe,
  isDrawer,
  isHost,
  showHostBadge,
}: {
  player: Player;
  rank: number;
  isMe: boolean;
  isDrawer: boolean;
  isHost: boolean;
  showHostBadge: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className={cn(
        "flex items-center gap-2.5 rounded-2xl px-2.5 py-2 transition-colors",
        isMe && "bg-accent-soft/60",
        !isMe && "hover:bg-muted/60"
      )}
    >
      <RankBadge rank={rank} />
      <PlayerAvatar player={player} pulse={isDrawer} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate text-sm",
              isMe ? "font-extrabold" : "font-semibold"
            )}
          >
            {player.name}
          </span>
          {isMe && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              You
            </Badge>
          )}
          {showHostBadge && isHost && (
            <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="Host" />
          )}
          {isDrawer && (
            <Palette className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Drawing" />
          )}
          {player.guessedThisRound && !isDrawer && (
            <span
              className="shrink-0 text-emerald-500"
              title="Guessed correctly"
              aria-label="Guessed correctly"
            >
              ✅
            </span>
          )}
          {!player.connected && (
            <span
              className="shrink-0 text-[10px] font-medium text-muted-foreground/70"
              title="Disconnected"
            >
              ●
            </span>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-extrabold tabular-nums leading-none text-foreground">
          {player.score}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          pts
        </div>
      </div>
    </motion.div>
  );
}

export function Scoreboard() {
  const room = useGameStore((s) => s.room);
  const me = useGameStore(selectMe);
  const isHost = useGameStore(selectIsHost);

  const players = React.useMemo(() => {
    if (!room) return [];
    return [...room.players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // stable tie-break: host first, then by id for determinism
      if (a.isHost !== b.isHost) return a.isHost ? -1 : 1;
      return a.id.localeCompare(b.id);
    });
  }, [room]);

  if (!room) return null;

  const drawerId = room.currentDrawerId;
  const myId = me?.id ?? null;

  return (
    <Card className="shadow-soft h-full gap-0 overflow-hidden rounded-2xl p-0">
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h2 className="font-extrabold tracking-tight">Scores</h2>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {players.length} {players.length === 1 ? "player" : "players"}
        </Badge>
      </header>

      <ScrollArea className="scroll-soft max-h-full flex-1 px-2 py-2">
        <div className="flex flex-col gap-1">
          {players.map((p, i) => {
            const rank = i + 1;
            const isDrawer = p.id === drawerId;
            return (
              <ScoreRow
                key={p.id}
                player={p}
                rank={rank}
                isMe={p.id === myId}
                isDrawer={isDrawer}
                isHost={p.isHost}
                showHostBadge={isHost}
              />
            );
          })}
          {players.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No players yet.
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}

export default Scoreboard;
