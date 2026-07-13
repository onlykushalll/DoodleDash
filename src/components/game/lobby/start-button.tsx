"use client";

import { Play, Loader2, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useGameStore, selectIsHost } from "@/lib/game/store";
import { getSocket } from "@/hooks/use-game-socket";
import { sfx } from "@/lib/game/sound";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

export function StartButton() {
  const room = useGameStore((s) => s.room);
  const isHost = useGameStore(selectIsHost);

  if (!room) return null;
  const playerCount = room.players.length;
  const canStart = playerCount >= 2;

  const start = () => {
    if (!isHost || !canStart) return;
    sfx.start();
    getSocket().emit("room:start");
  };

  // Non-hosts see a muted waiting state
  if (!isHost) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-5 text-sm font-medium text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Waiting for host to start the game...
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          animate={canStart ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={{
            duration: 1.8,
            repeat: canStart ? Infinity : 0,
            ease: "easeInOut",
          }}
          className="w-full"
        >
          <Button
            onClick={start}
            disabled={!canStart}
            size="lg"
            className="h-14 w-full rounded-2xl bg-grad text-base font-bold shadow-float hover:opacity-95"
          >
            <Play className="h-5 w-5" />
            Start Game
          </Button>
        </motion.div>
      </TooltipTrigger>
      {!canStart && (
        <TooltipContent>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            Need at least 2 players to start
          </span>
        </TooltipContent>
      )}
    </Tooltip>
  );
}

export default StartButton;
