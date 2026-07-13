"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Crown, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  color: string;
  wins: number;
  games: number;
  bestScore: number;
  totalScore: number;
}

export interface LeaderboardPreviewProps {
  className?: string;
  limit?: number;
}

export function LeaderboardPreview({
  className,
  limit = 5,
}: LeaderboardPreviewProps) {
  const [entries, setEntries] = React.useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (data?.ok && Array.isArray(data.leaderboard)) {
          setEntries(data.leaderboard.slice(0, limit));
        } else {
          setEntries([]);
          setError(true);
        }
      })
      .catch(() => {
        if (!alive) return;
        setEntries([]);
        setError(true);
      });
    return () => {
      alive = false;
    };
  }, [limit]);

  const top = entries ?? null;

  return (
    <Card
      className={`rounded-3xl border-border p-5 shadow-soft sm:p-6 ${className ?? ""}`}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft">
          <Trophy className="h-4 w-4 text-accent" />
        </span>
        <h2 className="text-lg font-bold">Top doodlers</h2>
      </div>

      {top === null ? (
        <ul className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2/50 p-3"
            >
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-2.5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-12 rounded-full" />
            </li>
          ))}
        </ul>
      ) : top.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2/40 py-10 text-center"
        >
          <span className="text-4xl">🎨</span>
          <p className="text-sm font-semibold">Be the first to score!</p>
          <p className="max-w-[16rem] text-xs text-muted-foreground">
            Play a round and your best score will land on the leaderboard.
          </p>
        </motion.div>
      ) : (
        <ol className="space-y-2">
          {top.map((p, i) => {
            const rank = i + 1;
            const isGold = rank === 1;
            return (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                  isGold
                    ? "border-accent/30 bg-accent-soft/50"
                    : "border-border bg-surface-2/50"
                }`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    isGold
                      ? "bg-grad text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                  aria-label={`Rank ${rank}`}
                >
                  {isGold ? <Crown className="h-3.5 w-3.5" /> : rank}
                </span>

                <span
                  className="avatar-ring-static grid h-10 w-10 shrink-0 place-items-center rounded-full p-[2px]"
                  style={{
                    background: `linear-gradient(135deg, ${p.color}, ${p.color}aa)`,
                  }}
                >
                  <span className="grid h-full w-full place-items-center rounded-full bg-card text-lg">
                    {p.avatar}
                  </span>
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.wins} win{p.wins === 1 ? "" : "s"} · {p.games} game
                    {p.games === 1 ? "" : "s"}
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-card px-2.5 py-1 text-xs font-bold text-foreground shadow-soft">
                  {p.bestScore.toLocaleString()}
                </span>
              </motion.li>
            );
          })}
        </ol>
      )}

      {error && top !== null && top.length === 0 && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Couldn&apos;t load the leaderboard. Pull to retry later.
        </p>
      )}
    </Card>
  );
}

export default LeaderboardPreview;
