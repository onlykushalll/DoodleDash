"use client";

import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useOrientation } from "@/hooks/use-orientation";
import { useGameStore } from "@/lib/game/store";

export function RotateOverlay() {
  const { isMobilePortrait } = useOrientation();
  const stage = useGameStore((s) => s.room?.stage);

  const activePlay = stage === "drawing" || stage === "choosing" || stage === "round-end";

  if (!isMobilePortrait || !activePlay) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-lg"
    >
      <motion.div
        animate={{ rotate: [0, -90, -90, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="text-6xl"
      >
        <RotateCcw className="size-16 text-primary" />
      </motion.div>
      <div className="text-center px-8">
        <h2 className="text-xl font-extrabold tracking-tight mb-2">
          Rotate your device
        </h2>
        <p className="text-sm text-muted-foreground max-w-[260px]">
          Doodle Dash works best in landscape mode. Please rotate your phone sideways.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-full bg-accent-soft px-4 py-2">
        <span className="text-2xl" aria-hidden>📱</span>
        <span className="text-xs font-bold text-accent-foreground">↻ Landscape</span>
      </div>
    </motion.div>
  );
}
