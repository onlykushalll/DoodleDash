"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import { AVATARS } from "@/lib/game/types";
import { sfx } from "@/lib/game/sound";
import { AvatarDrawDialog } from "@/components/game/avatar-draw-dialog";
import { useGameStore } from "@/lib/game/store";
import { cn } from "@/lib/utils";

export interface AvatarPickerProps {
  value: string;
  onChange: (avatar: string) => void;
  /** optional accent color used for the gradient ring around the selected avatar */
  accentColor?: string;
  className?: string;
}

export function AvatarPicker({
  value,
  onChange,
  accentColor,
  className,
}: AvatarPickerProps) {
  const [drawOpen, setDrawOpen] = React.useState(false);
  const customAvatar = useGameStore((s) => s.customAvatar);
  const ringStyle: React.CSSProperties = accentColor
    ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }
    : {};

  return (
    <div className={cn("space-y-2", className)}>
      {customAvatar && (
        <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft/50 p-2">
          <Avatar
            customAvatar={customAvatar}
            size={36}
          />
          <span className="text-xs font-semibold text-muted-foreground">Custom avatar active</span>
          <button
            type="button"
            onClick={() => { setDrawOpen(true); sfx.click(); }}
            className="ml-auto rounded-lg border border-border bg-card px-2 py-1 text-xs font-semibold hover:bg-muted"
          >
            Edit
          </button>
        </div>
      )}
      <div
        role="radiogroup"
        aria-label="Choose your avatar"
        className="max-h-40 overflow-y-auto scroll-soft rounded-2xl border bg-surface-2/60 p-2"
      >
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {/* Draw your own button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.06 }}
            onClick={() => { setDrawOpen(true); sfx.pop(); }}
            className="relative grid h-11 w-11 place-items-center rounded-full border-2 border-dashed border-accent text-accent transition hover:bg-accent-soft"
            aria-label="Draw your own avatar"
            title="Draw your own"
          >
            <Pencil className="size-4" />
          </motion.button>
          {AVATARS.map((emoji, i) => {
            const selected = value === emoji && !customAvatar;
            return (
              <motion.button
                type="button"
                key={`${emoji}-${i}`}
                role="radio"
                aria-checked={selected}
                aria-label={`Avatar ${emoji}`}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.06 }}
                onClick={() => {
                  if (!selected) {
                    sfx.pop();
                    onChange(emoji);
                  }
                }}
                className={cn(
                  "relative grid h-11 w-11 place-items-center rounded-full text-xl transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  selected ? "p-[2px]" : "hover:bg-accent-soft"
                )}
              >
                {selected && (
                  <span className="avatar-ring-static absolute inset-0 rounded-full" style={ringStyle} />
                )}
                <span
                  className={cn(
                    "relative grid h-full w-full place-items-center rounded-full bg-card",
                    selected && "scale-95"
                  )}
                >
                  <span aria-hidden>{emoji}</span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
      <AvatarDrawDialog open={drawOpen} onOpenChange={setDrawOpen} />
    </div>
  );
}

// Inline Avatar import (avoid circular dep issues by re-declaring minimally)
function Avatar({ customAvatar, size }: { customAvatar?: string | null; size?: number }) {
  return (
    <span
      className="avatar-ring-static inline-grid place-items-center rounded-full"
      style={{ width: size, height: size, padding: 2 }}
    >
      {customAvatar && (
        <img src={customAvatar} alt="" className="h-full w-full rounded-full object-cover" draggable={false} />
      )}
    </span>
  );
}

export default AvatarPicker;
