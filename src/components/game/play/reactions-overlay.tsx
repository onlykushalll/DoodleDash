"use client";

import { getSocket } from "@/hooks/use-game-socket";
import { useGameStore, selectIsDrawer } from "@/lib/game/store";
import { REACTIONS, type ReactionEmoji } from "@/lib/game/types";
import { sfx } from "@/lib/game/sound";
import { cn } from "@/lib/utils";

/**
 * Floating reactions overlay (the emojis that drift up over the canvas).
 * Rendered on top of the canvas; pointer-events-none so it never blocks
 * drawing.
 */
export function ReactionsOverlay({
  className,
}: {
  className?: string;
}) {
  const floating = useGameStore((s) => s.floatingReactions);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
      aria-hidden
    >
      {floating.map((r) => (
        <span
          key={r.id}
          className="animate-float-up absolute bottom-0 select-none text-3xl drop-shadow-md sm:text-4xl"
          style={{ left: `${Math.max(2, Math.min(96, r.x * 100))}%` }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}

/**
 * Reaction bar — a small row of emojis anchored to the bottom-right of the
 * canvas. Hidden for the active drawer (they're busy drawing). Tap to send.
 */
export function ReactionBar({
  className,
}: {
  className?: string;
}) {
  const isDrawer = useGameStore(selectIsDrawer);
  const addReaction = useGameStore((s) => s.addReaction);

  if (isDrawer) return null;

  const send = (emoji: ReactionEmoji) => {
    const x = 0.1 + Math.random() * 0.8;
    addReaction(emoji, x);
    getSocket().emit("reaction:send", { emoji, x });
    sfx.reaction();
  };

  return (
    <div
      className={cn(
        "glass absolute bottom-3 right-3 flex items-center gap-1 rounded-full border p-1 shadow-soft",
        className
      )}
      role="toolbar"
      aria-label="Send a reaction"
    >
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          aria-label={`Send reaction ${emoji}`}
          onClick={() => send(emoji)}
          className="grid size-9 place-items-center rounded-full text-xl transition-all hover:scale-125 hover:bg-accent-soft active:scale-95"
        >
          <span aria-hidden>{emoji}</span>
        </button>
      ))}
    </div>
  );
}
