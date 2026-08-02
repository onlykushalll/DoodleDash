"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RotateCw } from "lucide-react";
import { useOrientation } from "@/hooks/use-orientation";
import { useGameStore } from "@/lib/game/store";

/**
 * FULL-SCREEN, NON-DISMISSIBLE overlay shown on PHONE PORTRAIT during active
 * play. The game is unplayable in portrait — user MUST rotate to landscape.
 *
 * Only shows on phones (not tablets/desktops) and only during active gameplay
 * (drawing, choosing, round-end). In lobby and home, portrait is allowed.
 */
export function RotatePrompt() {
  const { isMobilePortrait } = useOrientation();
  const room = useGameStore((s) => s.room);
  const inGame = !!room && (room.stage === "drawing" || room.stage === "choosing" || room.stage === "round-end");

  const show = isMobilePortrait && inGame;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background p-8 text-center"
          role="alertdialog"
          aria-modal="true"
          aria-label="Please rotate your device to landscape"
        >
          <motion.div
            animate={{ rotate: [0, 90, 90, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", times: [0, 0.4, 0.6, 1] }}
            className="grid size-24 place-items-center rounded-3xl border-2 border-primary/30 bg-card shadow-float"
          >
            <RotateCw className="h-12 w-12 text-primary" />
          </motion.div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">
              Rotate your device
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Doodle Dash is best played in landscape.
              <br />
              Turn your phone sideways to continue.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            Waiting for landscape orientation…
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
