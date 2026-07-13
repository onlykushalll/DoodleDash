"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eraser, Trash2 } from "lucide-react";
import { useGameStore } from "@/lib/game/store";
import { sfx } from "@/lib/game/sound";
import { cn } from "@/lib/utils";

const COLORS = ["#000000", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7"];
const SIZES = [3, 6, 12];

export function AvatarDrawDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(6);
  const [eraser, setEraser] = useState(false);
  const setCustomAvatar = useGameStore((s) => s.setCustomAvatar);

  const ensureCtx = () => {
    const c = canvasRef.current;
    if (!c) return null;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    // Initialize white bg once
    if (!(c as any)._init) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      (c as any)._init = true;
    }
    return { c, ctx };
  };

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastRef.current = pos(e);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !lastRef.current) return;
    const p = pos(e);
    ctx.strokeStyle = eraser ? "#ffffff" : color;
    ctx.lineWidth = eraser ? size * 2 : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  };
  const onUp = () => {
    drawingRef.current = false;
    lastRef.current = null;
  };

  const clear = () => {
    const { c, ctx } = ensureCtx() ?? {};
    if (!c || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    sfx.pop();
  };

  const save = () => {
    const c = canvasRef.current;
    if (!c) return;
    const dataUrl = c.toDataURL("image/png");
    setCustomAvatar(dataUrl);
    sfx.correct();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center">Draw your avatar</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="overflow-hidden rounded-full border-4 border-border shadow-soft">
            <canvas
              ref={canvasRef}
              width={128}
              height={128}
              className="block touch-none rounded-full"
              style={{ width: 128, height: 128, cursor: "crosshair" }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerLeave={onUp}
            />
          </div>
          {/* Tools */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="flex gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setEraser(false); sfx.click(); }}
                  className={cn(
                    "size-6 rounded-md border-2 transition",
                    !eraser && color === c ? "scale-110 border-foreground" : "border-white/60"
                  )}
                  style={{ background: c }}
                  aria-label={`color ${c}`}
                />
              ))}
            </div>
            <div className="flex gap-1">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSize(s); sfx.click(); }}
                  className={cn(
                    "grid size-7 place-items-center rounded-md border",
                    size === s ? "border-foreground bg-muted" : "border-transparent hover:bg-muted"
                  )}
                  aria-label={`size ${s}`}
                >
                  <span className="block rounded-full" style={{ width: s, height: s, background: eraser ? "#999" : color }} />
                </button>
              ))}
            </div>
            <button
              onClick={() => { setEraser((v) => !v); sfx.pop(); }}
              className={cn("grid size-7 place-items-center rounded-md border", eraser ? "border-foreground bg-muted" : "border-transparent hover:bg-muted")}
              aria-label="eraser"
            >
              <Eraser className="size-4" />
            </button>
            <button onClick={clear} className="grid size-7 place-items-center rounded-md border border-transparent hover:bg-muted" aria-label="clear">
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCustomAvatar(null); onOpenChange(false); }}>Use emoji instead</Button>
          <Button onClick={save} className="bg-grad">Save avatar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AvatarDrawDialog;
