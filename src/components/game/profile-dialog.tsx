"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "./avatar";
import { useGameStore } from "@/lib/game/store";
import { loadProfile, loadPortfolio, type ProfileStats, type PortfolioItem } from "@/lib/game/profile";

export function ProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const name = useGameStore((s) => s.name);
  const emoji = useGameStore((s) => s.avatar);
  const customAvatar = useGameStore((s) => s.customAvatar);
  const avatarFrame = useGameStore((s) => s.avatarFrame);
  // Read fresh from localStorage each time the dialog is open. Client-only + idempotent.
  const liveStats = open ? loadProfile() : null;
  const livePortfolio = open ? loadPortfolio() : [];

  const winRate = liveStats && liveStats.games > 0 ? Math.round((liveStats.wins / liveStats.games) * 100) : 0;
  const avgScore = liveStats && liveStats.games > 0 ? Math.round(liveStats.totalScore / liveStats.games) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center">My Profile</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          <Avatar emoji={emoji} customAvatar={customAvatar} size={72} frame={avatarFrame} />
          <h3 className="text-lg font-extrabold">{name || "Doodler"}</h3>

          {liveStats ? (
            <div className="grid w-full grid-cols-3 gap-2 text-center">
              <Stat label="Games" value={liveStats.games} />
              <Stat label="Wins" value={liveStats.wins} />
              <Stat label="Win rate" value={`${winRate}%`} />
              <Stat label="Best score" value={liveStats.bestScore} />
              <Stat label="Avg score" value={avgScore} />
              <Stat label="Drawn" value={liveStats.wordsDrawn} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No games played yet. Play a round to build your profile!</p>
          )}

          {liveStats?.favoriteWord && (
            <Badge variant="secondary" className="mt-1">
              Favorite word: <span className="ml-1 font-mono font-bold">{liveStats.favoriteWord}</span>
            </Badge>
          )}

          {livePortfolio.length > 0 && (
            <div className="mt-3 w-full">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">My drawings ({livePortfolio.length})</p>
              <ScrollArea className="scroll-soft max-h-48">
                <div className="grid grid-cols-4 gap-2">
                  {livePortfolio.map((p, i) => (
                    <div key={i} className="overflow-hidden rounded-lg border bg-white">
                      <img src={p.dataUrl} alt={p.word} className="aspect-square w-full object-cover" draggable={false} />
                      <div className="truncate px-1 py-0.5 text-center text-[10px] font-semibold text-muted-foreground">{p.word}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-2">
      <div className="text-lg font-extrabold tabular-nums">{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

export default ProfileDialog;
