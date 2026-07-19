"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Crown, UserPlus } from "lucide-react";
import { useGameStore } from "@/lib/game/store";
import type { Player } from "@/lib/game/types";
import { Badge } from "@/components/ui/badge";
import { PlayerAvatar } from "@/components/game/avatar";
import { cn } from "@/lib/utils";

const MAX_PLAYERS = 12;
const MAX_EMPTY_SLOTS = 6;

interface PlayerCardProps {
  player: Player;
  isMe: boolean;
}

function PlayerCard({ player, isMe }: PlayerCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 rounded-2xl border bg-card p-4 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-float",
        isMe && "ring-2 ring-[var(--ring)]/50"
      )}
    >
      <div className="relative">
        <PlayerAvatar player={player} size={64} active={player.isHost} />
        {player.isHost && (
          <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-soft">
            <Crown className="h-3.5 w-3.5" />
          </div>
        )}
        {/* connected / ready pulse */}
        {player.connected ? (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </span>
        ) : (
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-muted-foreground/40 ring-2 ring-white" />
        )}
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="max-w-[120px] truncate text-sm font-bold text-foreground">
          {player.name}
        </span>
        <div className="flex items-center gap-1">
          {isMe && (
            <Badge variant="secondary" className="text-[10px]">
              You
            </Badge>
          )}
          {player.isSpectator && (
            <Badge variant="outline" className="text-[10px] text-amber-600">
              👁 Watch
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function EmptySlot({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-transparent p-4 opacity-70">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground/40">
        <UserPlus className="h-6 w-6" />
      </div>
      <span className="text-xs text-muted-foreground">{label ?? "Waiting..."}</span>
    </div>
  );
}

export function PlayersGrid() {
  const room = useGameStore((s) => s.room);
  const meId = useGameStore((s) => s.meId);

  if (!room) return null;
  const players = room.players;
  const canStart = players.length >= 2;
  const totalSlots = Math.min(MAX_PLAYERS - players.length, canStart ? 2 : MAX_EMPTY_SLOTS);

  return (
    <section aria-label="Players" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Players
        </h2>
        <span className="text-xs font-semibold text-muted-foreground">
          {players.length} / {MAX_PLAYERS}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {players.map((p) => (
            <PlayerCard key={p.id} player={p} isMe={p.id === meId} />
          ))}
        </AnimatePresence>
        {Array.from({ length: totalSlots }).map((_, i) => (
          <EmptySlot
            key={`empty-${i}`}
            label={canStart ? "Open slot" : i === 0 ? "Waiting for players…" : undefined}
          />
        ))}
      </div>
    </section>
  );
}

export default PlayersGrid;
