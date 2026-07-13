"use client";

import { motion } from "framer-motion";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sfx } from "@/lib/game/sound";

export function PaintStudioCard({ onPaint }: { onPaint?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl border bg-card p-6 shadow-float sm:p-8"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-2xl"
        style={{ background: "var(--grad-to)" }}
      />
      <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-grad text-white shadow-soft">
          <Palette className="size-8" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold sm:text-2xl">Paint Studio</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Unwind with a free-form canvas. All brushes, colors, shapes, and symmetry tools.
            No timers, no pressure — just you and your creativity. Save your masterpiece as PNG.
          </p>
        </div>
        <Button
          size="lg"
          className="shrink-0 rounded-2xl bg-grad shadow-soft"
          onClick={() => { sfx.click(); onPaint?.(); }}
        >
          <Palette className="mr-1 h-4 w-4" />
          Start Painting
        </Button>
      </div>
    </motion.div>
  );
}

export default PaintStudioCard;
