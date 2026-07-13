"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Palette } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BrushType, GalleryItem, ShapeStroke, Stroke } from "@/lib/game/types";

// ----------------------------------------------------------------------------
// GalleryCanvas — renders strokes/shapes (normalized 0..1) to a small canvas.
// Scales to fit the requested pixel width while preserving aspect ratio 4:3.
// ----------------------------------------------------------------------------
const ASPECT = 3 / 4; // height / width

function renderStroke(ctx: CanvasRenderingContext2D, s: Stroke, w: number, h: number) {
  if (s.points.length === 0) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // brush styling
  const size = Math.max(1, s.size * (w / 600)); // scale with canvas
  switch (s.brush as BrushType) {
    case "pen":
      ctx.strokeStyle = s.color;
      ctx.lineWidth = size;
      ctx.globalAlpha = 1;
      break;
    case "marker":
      ctx.strokeStyle = s.color;
      ctx.lineWidth = size * 1.6;
      ctx.globalAlpha = 0.45;
      break;
    case "pencil":
      ctx.strokeStyle = s.color;
      ctx.lineWidth = Math.max(1, size * 0.6);
      ctx.globalAlpha = 0.85;
      break;
    case "neon":
      ctx.strokeStyle = s.color;
      ctx.lineWidth = size;
      ctx.globalAlpha = 1;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = size * 2.4;
      break;
    case "eraser":
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = size * 2;
      ctx.globalAlpha = 1;
      break;
    default:
      ctx.strokeStyle = s.color;
      ctx.lineWidth = size;
      ctx.globalAlpha = 1;
  }

  ctx.beginPath();
  const pts = s.points;
  ctx.moveTo(pts[0].x * w, pts[0].y * h);
  if (pts.length === 1) {
    // dot
    ctx.lineTo(pts[0].x * w + 0.01, pts[0].y * h + 0.01);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = ((pts[i].x + pts[i + 1].x) / 2) * w;
      const yc = ((pts[i].y + pts[i + 1].y) / 2) * h;
      ctx.quadraticCurveTo(pts[i].x * w, pts[i].y * h, xc, yc);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x * w, last.y * h);
  }
  ctx.stroke();

  // neon: draw again without shadow for crispness
  if (s.brush === "neon") {
    ctx.shadowBlur = 0;
    ctx.stroke();
  }
  ctx.restore();
}

function renderShape(ctx: CanvasRenderingContext2D, sh: ShapeStroke, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = sh.color;
  ctx.lineWidth = Math.max(1, sh.size * (w / 600));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const x1 = sh.start.x * w;
  const y1 = sh.start.y * h;
  const x2 = sh.end.x * w;
  const y2 = sh.end.y * h;
  ctx.beginPath();
  switch (sh.kind) {
    case "line":
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      break;
    case "rect":
      ctx.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      break;
    case "ellipse": {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      break;
    }
  }
  ctx.stroke();
  ctx.restore();
}

export function GalleryCanvas({
  item,
  width = 220,
  className,
}: {
  item: GalleryItem;
  width?: number;
  className?: string;
}) {
  const height = Math.round(width * ASPECT);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // bg
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    for (const s of item.strokes ?? []) renderStroke(ctx, s, width, height);
    for (const sh of item.shapes ?? []) renderShape(ctx, sh, width, height);
  }, [item, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={cn(
        "block rounded-xl border border-border/60 bg-white shadow-soft",
        className
      )}
      aria-label={`Drawing of ${item.word}`}
    />
  );
}

// ----------------------------------------------------------------------------
// GalleryDialog — replay gallery. Carousel with prev/next, plus counter.
// ----------------------------------------------------------------------------
export function GalleryDialog({
  open,
  onOpenChange,
  gallery,
  trigger,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  gallery: GalleryItem[];
  trigger?: React.ReactNode;
}) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (open) setIndex((i) => Math.min(i, Math.max(0, gallery.length - 1)));
  }, [open, gallery.length]);

  const current = gallery[index];
  const hasItems = gallery.length > 0;

  const go = (delta: number) => {
    if (!hasItems) return;
    setIndex((i) => (i + delta + gallery.length) % gallery.length);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent className="max-w-2xl rounded-3xl p-0 sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 text-xl font-extrabold">
            <Palette className="h-5 w-5 text-primary" />
            Doodle Gallery
          </DialogTitle>
          <DialogDescription>
            Every masterpiece from this match — relive the chaos.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {!hasItems ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 py-16 text-center">
              <Palette className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No drawings were saved this match.
              </p>
            </div>
          ) : (
            <>
              <div className="relative mx-auto flex max-w-md flex-col items-center">
                <GalleryCanvas item={current} width={360} className="mx-auto" />
                {/* Carousel controls */}
                <div className="mt-3 flex w-full items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => go(-1)}
                    disabled={gallery.length <= 1}
                    aria-label="Previous drawing"
                    className="rounded-full"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex flex-col items-center text-center">
                    <div className="text-lg font-extrabold tracking-tight text-grad">
                      {current.word}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      by <span className="font-semibold">{current.drawerName}</span>
                    </div>
                    <Badge variant="secondary" className="mt-1 text-[10px] tabular-nums">
                      Round {current.round}
                    </Badge>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => go(1)}
                    disabled={gallery.length <= 1}
                    aria-label="Next drawing"
                    className="rounded-full"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {gallery.map((g, i) => (
                    <button
                      key={g.id}
                      onClick={() => setIndex(i)}
                      className={cn(
                        "h-2.5 w-2.5 rounded-full transition-all",
                        i === index
                          ? "bg-primary w-5"
                          : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
                      )}
                      aria-label={`Go to drawing ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GalleryDialog;
