"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { sfx } from "@/lib/game/sound";
import { cn } from "@/lib/utils";

export interface ColorPickerRowProps {
  value: string;
  onChange: (color: string) => void;
  colors: string[];
  className?: string;
  /** accessible label for the radiogroup */
  label?: string;
}

export function ColorPickerRow({
  value,
  onChange,
  colors,
  className,
  label = "Choose a color",
}: ColorPickerRowProps) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {colors.map((c) => {
        const selected = value.toLowerCase() === c.toLowerCase();
        return (
          <motion.button
            type="button"
            key={c}
            role="radio"
            aria-checked={selected}
            aria-label={`Color ${c}`}
            whileTap={{ scale: 0.85 }}
            whileHover={{ scale: 1.1 }}
            onClick={() => {
              if (!selected) {
                sfx.pop();
                onChange(c);
              }
            }}
            className={cn(
              "relative grid h-8 w-8 place-items-center rounded-full transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected && "ring-2 ring-foreground/40"
            )}
            style={{ backgroundColor: c }}
          >
            {selected && (
              <Check
                className="h-4 w-4 text-white drop-shadow-sm"
                strokeWidth={3}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export default ColorPickerRow;
