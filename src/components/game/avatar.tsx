"use client";

import { cn } from "@/lib/utils";
import type { Player } from "@/lib/game/types";

// Frame ring styles. `active` uses the animated conic gradient; otherwise static.
function frameRingClass(frame: string): string {
  switch (frame) {
    case "gold":
      return "ring-2 ring-amber-400";
    case "rainbow":
      return "avatar-ring-static"; // conic-like via gradient (animated if `active`)
    case "neon":
      return "ring-2 ring-primary shadow-[0_0_10px_var(--accent)]";
    case "dotted":
      return "ring-2 ring-dotted ring-foreground/50";
    case "frost":
      return "ring-2 ring-cyan-300";
    default:
      return "ring-1 ring-border";
  }
}

export interface AvatarProps {
  emoji?: string;
  customAvatar?: string | null; // data URL — overrides emoji
  size?: number;
  frame?: string; // "none" | "gold" | "rainbow" | "neon" | "dotted" | "frost"
  active?: boolean; // animated ring (your turn / guessing)
  className?: string;
}

export function Avatar({
  emoji = "🐱",
  customAvatar,
  size = 48,
  frame = "none",
  active = false,
  className,
}: AvatarProps) {
  // For rainbow + active, use the animated conic gradient ring.
  const useAnimated = active || frame === "rainbow";
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center rounded-full",
        useAnimated ? "avatar-ring" : "avatar-ring-static",
        frame !== "none" && frame !== "rainbow" && frameRingClass(frame),
        className
      )}
      style={{ width: size, height: size, padding: 3 }}
      aria-hidden
    >
      <span
        className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-card"
        style={{ fontSize: size * 0.5 }}
      >
        {customAvatar ? (
          <img
            src={customAvatar}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <span>{emoji}</span>
        )}
      </span>
    </span>
  );
}

/**
 * Render an avatar for a Player. Uses `player.customAvatar` (from room state,
 * broadcast by the server) so ALL players see each other's custom avatars —
 * not just their own.
 */
export function PlayerAvatar({
  player,
  size = 48,
  active = false,
  frame,
}: {
  player: Player;
  size?: number;
  active?: boolean;
  frame?: string;
}) {
  return (
    <Avatar
      emoji={player.avatar}
      customAvatar={player.customAvatar}
      size={size}
      active={active}
      frame={frame}
    />
  );
}

export default Avatar;
