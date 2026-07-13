"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar } from "./avatar";
import { useGameStore } from "@/lib/game/store";
import { AVATAR_FRAMES, CANVAS_BORDERS, PLAYER_COLORS } from "@/lib/game/types";
import { sfx } from "@/lib/game/sound";
import { cn } from "@/lib/utils";

const NAME_COLORS = [
  null, // default
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#a855f7", "#ec4899", "#8b5cf6",
];

export function CosmeticsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const avatarFrame = useGameStore((s) => s.avatarFrame);
  const setAvatarFrame = useGameStore((s) => s.setAvatarFrame);
  const nameColor = useGameStore((s) => s.nameColor);
  const setNameColor = useGameStore((s) => s.setNameColor);
  const canvasBorder = useGameStore((s) => s.canvasBorder);
  const setCanvasBorder = useGameStore((s) => s.setCanvasBorder);
  const emoji = useGameStore((s) => s.avatar);
  const customAvatar = useGameStore((s) => s.customAvatar);

  // Hydrate + persist cosmetics
  useEffect(() => {
    try {
      const raw = localStorage.getItem("dd-cosmetics");
      if (raw) {
        const c = JSON.parse(raw);
        if (c.avatarFrame) setAvatarFrame(c.avatarFrame);
        if (c.nameColor !== undefined) setNameColor(c.nameColor);
        if (c.canvasBorder) setCanvasBorder(c.canvasBorder);
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("dd-cosmetics", JSON.stringify({ avatarFrame, nameColor, canvasBorder }));
    } catch { /* ignore */ }
  }, [avatarFrame, nameColor, canvasBorder]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center">🎨 Customize</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="frames">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="frames">Frames</TabsTrigger>
            <TabsTrigger value="name">Name color</TabsTrigger>
            <TabsTrigger value="border">Canvas border</TabsTrigger>
          </TabsList>

          <TabsContent value="frames" className="mt-4">
            <div className="grid grid-cols-3 gap-3">
              {AVATAR_FRAMES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setAvatarFrame(f.id); sfx.pop(); }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-3 transition",
                    avatarFrame === f.id ? "border-transparent bg-grad text-white shadow-soft" : "border-border hover:bg-accent-soft"
                  )}
                >
                  <Avatar emoji={emoji} customAvatar={customAvatar} size={44} frame={f.id} />
                  <span className="text-xs font-semibold">{f.label}</span>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="name" className="mt-4">
            <div className="grid grid-cols-5 gap-2">
              {NAME_COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => { setNameColor(c); sfx.pop(); }}
                  className={cn(
                    "grid h-10 place-items-center rounded-xl border text-xs font-bold transition",
                    nameColor === c ? "border-foreground ring-2 ring-ring" : "border-border hover:bg-accent-soft"
                  )}
                  style={c ? { color: c } : undefined}
                >
                  {c ? "Aa" : "Default"}
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">Your name in chat &amp; scoreboard gets this color.</p>
          </TabsContent>

          <TabsContent value="border" className="mt-4">
            <div className="grid grid-cols-2 gap-2">
              {CANVAS_BORDERS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => { setCanvasBorder(b.id); sfx.pop(); }}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-sm font-semibold transition",
                    canvasBorder === b.id ? "border-transparent bg-grad text-white" : "border-border hover:bg-accent-soft"
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        <div className="mt-2 text-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CosmeticsDialog;
