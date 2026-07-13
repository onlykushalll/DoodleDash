"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useTheme } from "@/components/game/theme-provider";
import { sfx } from "@/lib/game/sound";
import type { ThemeName } from "@/lib/game/types";
import { cn } from "@/lib/utils";

interface ThemeOption {
  name: ThemeName;
  label: string;
  from: string;
  to: string;
  emoji: string;
}

const THEMES: ThemeOption[] = [
  { name: "peach", label: "Peach", from: "#ffd9a8", to: "#ff7a59", emoji: "🍑" },
  { name: "mint", label: "Mint", from: "#a7f3d0", to: "#10b981", emoji: "🌿" },
  { name: "sky", label: "Sky", from: "#a5f3fc", to: "#06b6d4", emoji: "💧" },
  { name: "lavender", label: "Lavender", from: "#ddd6fe", to: "#8b5cf6", emoji: "💜" },
];

export interface ThemeSwitcherProps {
  className?: string;
  /** compact mode hides labels — used in sticky header */
  compact?: boolean;
}

export function ThemeSwitcher({ className, compact = false }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cn("flex items-center gap-2", className)}
    >
      {THEMES.map((t) => {
        const selected = theme === t.name;
        return (
          <motion.button
            type="button"
            key={t.name}
            role="radio"
            aria-checked={selected}
            aria-label={`${t.label} theme`}
            title={t.label}
            whileTap={{ scale: 0.85 }}
            whileHover={{ scale: 1.12 }}
            onClick={() => {
              if (!selected) {
                sfx.pop();
                setTheme(t.name);
              }
            }}
            className={cn(
              "relative grid place-items-center rounded-full transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              compact ? "h-7 w-7" : "h-9 w-9",
              selected && "ring-2 ring-foreground/30"
            )}
            style={{
              backgroundImage: `linear-gradient(135deg, ${t.from}, ${t.to})`,
            }}
          >
            {selected && (
              <Check
                className="h-3.5 w-3.5 text-white drop-shadow-sm"
                strokeWidth={3}
              />
            )}
            {!compact && !selected && (
              <span className="sr-only">{t.label}</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export default ThemeSwitcher;
