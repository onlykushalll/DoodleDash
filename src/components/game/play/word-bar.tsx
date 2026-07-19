"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Sparkles } from "lucide-react";
import { useGameStore, selectIsDrawer, selectMe } from "@/lib/game/store";
import { cn } from "@/lib/utils";

function timerColor(ratio: number): string {
  if (ratio > 0.5) return "var(--accent)";
  if (ratio > 0.2) return "#f59e0b";
  return "#ef4444";
}

/**
 * Circular SVG progress ring showing remaining time. Color shifts from accent
 * → amber → red as time runs out. Pulses red in the final 5 seconds.
 */
function TimerRing({
  timeLeft,
  total,
  urgent,
}: {
  timeLeft: number;
  total: number;
  urgent: boolean;
}) {
  const size = 44;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.max(0, Math.min(1, timeLeft / total)) : 0;
  const offset = c * (1 - ratio);
  const color = timerColor(ratio);
  return (
    <div
      className={cn(
        "relative grid place-items-center",
        urgent && "animate-pulse-ring rounded-full"
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: "linear" }}
        />
      </svg>
      <motion.span
        key={timeLeft}
        initial={urgent ? { scale: 0.7 } : false}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 18 }}
        className="absolute font-extrabold tabular-nums"
        style={{ color: urgent ? "#ef4444" : color, fontSize: 18 }}
      >
        {timeLeft}
      </motion.span>
    </div>
  );
}

export function WordBar({ className }: { className?: string }) {
  const room = useGameStore((s) => s.room);
  const myWord = useGameStore((s) => s.myWord);
  const isDrawer = useGameStore(selectIsDrawer);
  const me = useGameStore(selectMe);

  const drawer = useMemo(
    () => room?.players.find((p) => p.id === room.currentDrawerId) ?? null,
    [room]
  );

  if (!room) return null;

  const total = room.settings.drawTime;
  const timeLeft = Math.max(0, room.timeLeft);
  const urgent = timeLeft <= 5 && timeLeft > 0 && room.stage === "drawing";
  const word = myWord ?? room.currentWord ?? "";
  const hint = room.wordHint ?? "";
  const isChoosing = room.stage === "choosing";

  // Decide what to show in the center pill.
  // - choosing: placeholder "..." (drawer is picking; everyone waits)
  // - drawing: drawer sees full word, guessers see hint
  // - round-end / game-end: everyone sees the actual word
  const revealWord =
    room.stage === "round-end" || room.stage === "game-end"
      ? true
      : room.stage === "drawing" && isDrawer
      ? true
      : false;
  const showHint = room.stage === "drawing" && !isDrawer;

  return (
    <div
      className={cn(
        "glass flex items-center justify-between gap-2 rounded-xl border px-3 py-1.5 shadow-soft sm:gap-3 sm:px-4 sm:py-2",
        className
      )}
    >
      {/* Left: round info (compact) */}
      <div className="flex shrink-0 flex-col items-start">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[10px]">
          Round
        </span>
        <span className="text-sm font-extrabold tabular-nums leading-none sm:text-base">
          {room.currentRound}
          <span className="mx-1 text-muted-foreground">/</span>
          {room.totalRounds}
        </span>
      </div>

      {/* Center: word / hint + timer */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-col items-center gap-1">
          <span
            className={cn(
              "flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide",
              isDrawer && room.stage === "drawing"
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            {isChoosing ? (
              isDrawer ? (
                <>
                  <Sparkles className="size-3" />
                  Pick a word!
                </>
              ) : (
                "Waiting for word…"
              )
            ) : isDrawer && room.stage === "drawing" ? (
              <>
                <Sparkles className="size-3" />
                You&apos;re drawing!
              </>
            ) : room.stage === "round-end" || room.stage === "game-end" ? (
              "The word was"
            ) : (
              "Guess the word!"
            )}
          </span>
          {revealWord ? (
            <motion.div
              key={`word-${word}`}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 16 }}
              className="flex items-center gap-1.5 rounded-full bg-grad px-4 py-1.5 font-extrabold text-white shadow-soft"
            >
              <span className="uppercase tracking-wider">{word || "—"}</span>
            </motion.div>
          ) : showHint ? (
            <div className="rounded-full border border-border bg-card px-4 py-1.5 shadow-soft">
              <span
                className="font-mono text-base font-bold tracking-[0.2em] text-foreground sm:text-xl"
                aria-label="Word hint"
              >
                {hint || "—"}
              </span>
            </div>
          ) : (
            <div className="rounded-full border border-border bg-card px-4 py-1.5 shadow-soft">
              <span className="font-mono text-base font-bold tracking-[0.2em] text-muted-foreground sm:text-xl">
                …
              </span>
            </div>
          )}
        </div>

        {room.stage === "drawing" && (
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <TimerRing timeLeft={timeLeft} total={total} urgent={urgent} />
            <Clock
              className={cn("size-5", urgent ? "text-red-500" : "text-muted-foreground")}
              aria-hidden
            />
          </div>
        )}
      </div>

      {/* Right: whose turn */}
      <div className="flex min-w-0 flex-col items-end gap-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {isDrawer ? "Your turn" : "Drawing"}
        </span>
        <span className="flex max-w-[160px] items-center gap-1 truncate font-bold leading-none">
          <span aria-hidden>{drawer?.avatar ?? "🎨"}</span>
          <span className="truncate">
            {drawer ? drawer.name : me?.name ?? "..."}
          </span>
        </span>
        {/* Mobile compact timer */}
        {room.stage === "drawing" && (
          <span
            className={cn(
              "mt-1 flex items-center gap-1 text-xs font-bold tabular-nums sm:hidden",
              urgent ? "text-red-500" : "text-muted-foreground"
            )}
          >
            <Clock className="size-3" />
            {timeLeft}s
          </span>
        )}
      </div>
    </div>
  );
}
