"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/game/logo";
import { ThemeSwitcher } from "@/components/game/home/theme-switcher";
import {
  Pen, Highlighter, Pencil, Sparkles, Eraser,
  Minus, Square, Circle, PaintBucket, Undo2, Trash2, Download,
  ArrowLeft, FlipHorizontal, FlipVertical, Grid2x2,
  type LucideIcon,
} from "lucide-react";
import { useGameStore } from "@/lib/game/store";
import { sfx } from "@/lib/game/sound";
import { cn } from "@/lib/utils";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const LOGICAL_W = 1600;
const LOGICAL_H = 900;

type BrushType = "pen" | "marker" | "pencil" | "neon" | "eraser";
type ShapeType = "line" | "rect" | "ellipse";
type ToolMode = "brush" | "shape" | "fill";

const CANVAS_COLORS = [
  "#ffffff", "#c1c1c1", "#ef130b", "#ff7100", "#ffe400", "#00cc00", "#00b2ff", "#231fd3", "#a300ba", "#d37caa", "#a0522d",
  "#000000", "#4c4c4c", "#740b07", "#c23800", "#e8a200", "#005510", "#00569e", "#0e0865", "#550069", "#a75574", "#63300d",
];
const BRUSH_SIZES = [4, 8, 16, 28];
const BRUSH_ICONS: Record<BrushType, LucideIcon> = {
  pen: Pen, marker: Highlighter, pencil: Pencil, neon: Sparkles, eraser: Eraser,
};

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface Stroke {
  id: string;
  color: string;
  size: number;
  brush: BrushType;
  points: { x: number; y: number }[];
}
interface ShapeStroke {
  id: string;
  kind: ShapeType;
  color: string;
  size: number;
  start: { x: number; y: number };
  end: { x: number; y: number };
}
type CanvasItem = { kind: "stroke"; stroke: Stroke } | { kind: "shape"; shape: ShapeStroke };

export function PaintStudio({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dprRef = useRef(1);

  const historyRef = useRef<CanvasItem[]>([]);
  const fillsRef = useRef<{ x: number; y: number; color: string }[]>([]);
  const liveStrokeRef = useRef<Stroke | null>(null);
  const previewShapeRef = useRef<ShapeStroke | null>(null);
  const isDrawingRef = useRef(false);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  // Drawing settings (local state — not in game store)
  const [brush, setBrush] = useState<BrushType>("pen");
  const [brushSize, setBrushSize] = useState(8);
  const [brushColor, setBrushColor] = useState("#000000");
  const [shape, setShape] = useState<ShapeType>("line");
  const [toolMode, setToolMode] = useState<ToolMode>("brush");
  const [symmetry, setSymmetry] = useState<0 | 1 | 2 | 4>(0);
  const [texture, setTexture] = useState<"plain" | "dots" | "grid" | "parchment" | "dark">("plain");
  const [clearOpen, setClearOpen] = useState(false);

  // ---- Canvas setup ----
  const redrawRef = useRef<() => void>(() => {});
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    dprRef.current = dpr;
    const rect = wrap.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    if (!baseRef.current) {
      baseRef.current = document.createElement("canvas");
    }
    const base = baseRef.current;
    base.width = canvas.width;
    base.height = canvas.height;
    redrawRef.current();
  }, []);

  // ---- Drawing functions ----
  function applyBrushStyle(ctx: CanvasRenderingContext2D, b: BrushType, color: string, size: number) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.globalCompositeOperation = "source-over";
    ctx.setLineDash([]);
    switch (b) {
      case "pen":
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        break;
      case "marker":
        ctx.strokeStyle = color;
        ctx.lineWidth = size * 1.4;
        ctx.globalAlpha = 0.35;
        break;
      case "pencil":
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, size * 0.7);
        ctx.globalAlpha = 0.5;
        break;
      case "neon":
        ctx.shadowBlur = size * 2;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, size * 0.6);
        break;
      case "eraser":
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = size * 1.5;
        break;
    }
  }

  function strokePath(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
    const W = canvasRef.current!.width / dprRef.current;
    const H = canvasRef.current!.height / dprRef.current;
    if (pts.length === 0) return;
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x * W, pts[0].y * H, Math.max(0.5, ctx.lineWidth / 2), 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    if (pts.length === 2) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x * W, pts[0].y * H);
      ctx.lineTo(pts[1].x * W, pts[1].y * H);
      ctx.stroke();
      return;
    }
    // Catmull-Rom spline for buttery smooth curves
    ctx.beginPath();
    ctx.moveTo(pts[0].x * W, pts[0].y * H);
    for (let i = 0; i < pts.length - 2; i++) {
      const p0 = pts[i > 0 ? i - 1 : 0];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : pts.length - 1];
      const cp1x = p1.x * W + (p2.x - p0.x) * W / 6;
      const cp1y = p1.y * H + (p2.y - p0.y) * H / 6;
      const cp2x = p2.x * W - (p3.x - p1.x) * W / 6;
      const cp2y = p2.y * H - (p3.y - p1.y) * H / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x * W, p2.y * H);
    }
    ctx.lineTo(pts[pts.length - 1].x * W, pts[pts.length - 1].y * H);
    ctx.stroke();
  }

  function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
    if (s.points.length === 0) return;
    if (s.brush === "neon") {
      applyBrushStyle(ctx, "neon", s.color, s.size);
      strokePath(ctx, s.points);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(1, s.size * 0.25);
      ctx.globalAlpha = 0.9;
      strokePath(ctx, s.points);
      ctx.globalAlpha = 1;
      return;
    }
    applyBrushStyle(ctx, s.brush, s.color, s.size);
    strokePath(ctx, s.points);
  }

  function drawShape(ctx: CanvasRenderingContext2D, sh: ShapeStroke) {
    const W = canvasRef.current!.width / dprRef.current;
    const H = canvasRef.current!.height / dprRef.current;
    applyBrushStyle(ctx, "pen", sh.color, sh.size);
    const sx = sh.start.x * W, sy = sh.start.y * H;
    const ex = sh.end.x * W, ey = sh.end.y * H;
    ctx.beginPath();
    switch (sh.kind) {
      case "line": ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); break;
      case "rect": ctx.rect(Math.min(sx, ex), Math.min(sy, ey), Math.abs(ex - sx), Math.abs(ey - sy)); ctx.stroke(); break;
      case "ellipse": {
        const cx = (sx + ex) / 2, cy = (sy + ey) / 2;
        ctx.ellipse(cx, cy, Math.abs(ex - sx) / 2, Math.abs(ey - sy) / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
    }
  }

  function drawItem(ctx: CanvasRenderingContext2D, item: CanvasItem) {
    if (item.kind === "stroke") drawStroke(ctx, item.stroke);
    else drawShape(ctx, item.shape);
  }

  function floodFill(ctx: CanvasRenderingContext2D, x: number, y: number, fillColor: string, w: number, h: number) {
    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;
    const idx = (Math.floor(y) * w + Math.floor(x)) * 4;
    const targetR = data[idx], targetG = data[idx + 1], targetB = data[idx + 2], targetA = data[idx + 3];
    const hex = fillColor.replace("#", "");
    const fr = parseInt(hex.slice(0, 2), 16);
    const fg = parseInt(hex.slice(2, 4), 16);
    const fb = parseInt(hex.slice(4, 6), 16);
    if (targetR === fr && targetG === fg && targetB === fb && targetA === 255) return;
    const stack = [[Math.floor(x), Math.floor(y)]];
    while (stack.length) {
      const [px, py] = stack.pop()!;
      if (px < 0 || px >= w || py < 0 || py >= h) continue;
      const i = (py * w + px) * 4;
      if (Math.abs(data[i] - targetR) > 8 || Math.abs(data[i + 1] - targetG) > 8 || Math.abs(data[i + 2] - targetB) > 8 || Math.abs(data[i + 3] - targetA) > 8) continue;
      data[i] = fr; data[i + 1] = fg; data[i + 2] = fb; data[i + 3] = 255;
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
    ctx.putImageData(img, 0, 0);
  }

  function syncBaseFromHistory() {
    const base = baseRef.current;
    const bctx = base?.getContext("2d");
    if (!base || !bctx) return;
    const dpr = dprRef.current;
    bctx.save();
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.fillStyle = texture === "dark" ? "#1a1a2e" : texture === "parchment" ? "#f5ecd9" : "#ffffff";
    bctx.fillRect(0, 0, base.width, base.height);
    bctx.restore();
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const item of historyRef.current) drawItem(bctx, item);
    for (const f of fillsRef.current) {
      floodFill(bctx, f.x * base.width / dpr, f.y * base.height / dpr, f.color, base.width, base.height);
    }
  }

  function renderFrame() {
    const canvas = canvasRef.current;
    const base = baseRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !base || !ctx) return;
    const dpr = dprRef.current;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    ctx.restore();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (liveStrokeRef.current) {
      drawStroke(ctx, liveStrokeRef.current);
      // Symmetry mirrors
      if (symmetry > 0 && liveStrokeRef.current.brush !== "eraser") {
        const pts = liveStrokeRef.current.points;
        if (symmetry === 1 || symmetry === 4) {
          drawStroke(ctx, { ...liveStrokeRef.current, points: pts.map(p => ({ x: 1 - p.x, y: p.y })) });
        }
        if (symmetry === 2 || symmetry === 4) {
          drawStroke(ctx, { ...liveStrokeRef.current, points: pts.map(p => ({ x: p.x, y: 1 - p.y })) });
        }
        if (symmetry === 4) {
          drawStroke(ctx, { ...liveStrokeRef.current, points: pts.map(p => ({ x: 1 - p.x, y: 1 - p.y })) });
        }
      }
    }
    if (previewShapeRef.current) drawShape(ctx, previewShapeRef.current);
  }

  function scheduleRender() {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      renderFrame();
    });
  }

  function redraw() {
    syncBaseFromHistory();
    scheduleRender();
  }

  // Keep redrawRef updated so setupCanvas (memoized) always calls the latest version
  useEffect(() => {
    redrawRef.current = redraw;
  });

  // ---- Pointer events ----
  const getPoint = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = getPoint(e);

    if (toolMode === "fill") {
      fillsRef.current.push({ x: p.x, y: p.y, color: brushColor });
      syncBaseFromHistory();
      scheduleRender();
      sfx.pop();
      return;
    }

    if (toolMode === "shape") {
      isDrawingRef.current = true;
      shapeStartRef.current = p;
      previewShapeRef.current = { id: makeId(), kind: shape, color: brushColor, size: brushSize, start: p, end: p };
      scheduleRender();
      return;
    }

    // Brush mode
    isDrawingRef.current = true;
    const color = brush === "eraser" ? "#ffffff" : brushColor;
    liveStrokeRef.current = { id: makeId(), color, size: brushSize, brush, points: [p] };
    scheduleRender();
  };

  const onMove = (e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    const p = getPoint(e);

    if (toolMode === "shape") {
      if (previewShapeRef.current) {
        previewShapeRef.current.end = p;
        scheduleRender();
      }
      return;
    }

    const stroke = liveStrokeRef.current;
    if (!stroke) return;
    const last = stroke.points[stroke.points.length - 1];
    if (Math.abs(p.x - last.x) < 0.0015 && Math.abs(p.y - last.y) < 0.0015) return;
    stroke.points.push(p);
    scheduleRender();
  };

  const onUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (toolMode === "shape") {
      const preview = previewShapeRef.current;
      shapeStartRef.current = null;
      previewShapeRef.current = null;
      if (preview) {
        historyRef.current.push({ kind: "shape", shape: preview });
        syncBaseFromHistory();
      }
      scheduleRender();
      return;
    }

    const stroke = liveStrokeRef.current;
    liveStrokeRef.current = null;
    if (stroke && stroke.points.length > 0) {
      historyRef.current.push({ kind: "stroke", stroke });
      // Symmetry: add mirror copies to history
      if (symmetry > 0 && stroke.brush !== "eraser") {
        const pts = stroke.points;
        if (symmetry === 1 || symmetry === 4) {
          historyRef.current.push({ kind: "stroke", stroke: { ...stroke, id: makeId(), points: pts.map(p => ({ x: 1 - p.x, y: p.y })) } });
        }
        if (symmetry === 2 || symmetry === 4) {
          historyRef.current.push({ kind: "stroke", stroke: { ...stroke, id: makeId(), points: pts.map(p => ({ x: p.x, y: 1 - p.y })) } });
        }
        if (symmetry === 4) {
          historyRef.current.push({ kind: "stroke", stroke: { ...stroke, id: makeId(), points: pts.map(p => ({ x: 1 - p.x, y: 1 - p.y })) } });
        }
      }
      syncBaseFromHistory();
    }
    scheduleRender();
  };

  const handleUndo = () => {
    historyRef.current.pop();
    syncBaseFromHistory();
    scheduleRender();
    sfx.click();
  };

  const handleClear = () => {
    historyRef.current = [];
    fillsRef.current = [];
    syncBaseFromHistory();
    scheduleRender();
    setClearOpen(false);
    sfx.click();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Render to a clean export canvas (white bg, no UI)
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = LOGICAL_W;
    exportCanvas.height = LOGICAL_H;
    const ectx = exportCanvas.getContext("2d");
    if (!ectx) return;
    ectx.fillStyle = texture === "dark" ? "#1a1a2e" : texture === "parchment" ? "#f5ecd9" : "#ffffff";
    ectx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    // Draw the base canvas scaled up
    const base = baseRef.current;
    if (base) ectx.drawImage(base, 0, 0, LOGICAL_W, LOGICAL_H);
    const link = document.createElement("a");
    link.download = `doodle-dash-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
    sfx.correct();
  };

  useEffect(() => {
    setupCanvas();
    const onResize = () => setupCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setupCanvas]);

  const textureClass = texture === "dots" ? "canvas-dots" : texture === "grid" ? "canvas-grid" : "";
  const wrapperBg = texture === "dark" ? "#1a1a2e" : texture === "parchment" ? "#f5ecd9" : "#ffffff";

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Top bar */}
      <header className="glass z-30 flex shrink-0 items-center justify-between border-b px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { sfx.click(); onExit(); }}
            className="rounded-lg border bg-card p-1.5 text-muted-foreground transition hover:bg-muted"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <LogoMark size={32} />
          <span className="hidden text-sm font-bold sm:inline">Paint Studio</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button size="sm" variant="secondary" onClick={handleDownload} className="rounded-xl">
            <Download className="mr-1 h-4 w-4" /> Save
          </Button>
          <ThemeSwitcher compact />
        </div>
      </header>

      {/* Canvas area */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:p-3">
        <div className="relative min-h-0 flex-1">
          <div
            ref={wrapRef}
            className={cn("relative h-full w-full overflow-hidden rounded-2xl border shadow-soft", textureClass)}
            style={{ background: wrapperBg }}
          >
            <canvas
              ref={canvasRef}
              className="block h-full w-full touch-none"
              style={{ touchAction: "none", cursor: "crosshair" }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerLeave={onUp}
              onPointerCancel={onUp}
            />
          </div>
        </div>

        {/* Toolbar */}
        <div className="glass flex flex-wrap items-center gap-2 rounded-2xl border p-2 shadow-soft">
          {/* Brushes */}
          <div className="flex items-center gap-1">
            {(["pen", "marker", "pencil", "neon", "eraser"] as BrushType[]).map((b) => {
              const Icon = BRUSH_ICONS[b];
              const active = toolMode === "brush" && brush === b;
              return (
                <Tooltip key={b}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => { setBrush(b); setToolMode("brush"); sfx.pop(); }}
                      className={cn("grid size-10 place-items-center rounded-xl border transition", active ? "border-transparent bg-grad text-white" : "border-border bg-card hover:bg-accent-soft")}
                    >
                      <Icon className="size-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{b}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          <span className="mx-1 hidden h-8 w-px bg-border sm:block" />

          {/* Shapes */}
          <div className="flex items-center gap-1">
            {([["line", Minus], ["rect", Square], ["ellipse", Circle]] as [ShapeType, LucideIcon][]).map(([st, Icon]) => {
              const active = toolMode === "shape" && shape === st;
              return (
                <Tooltip key={st}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => { setShape(st); setToolMode("shape"); sfx.pop(); }}
                      className={cn("grid size-10 place-items-center rounded-xl border transition", active ? "border-transparent bg-grad text-white" : "border-border bg-card hover:bg-accent-soft")}
                    >
                      <Icon className="size-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{st}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          <span className="mx-1 hidden h-8 w-px bg-border sm:block" />

          {/* Fill */}
          <button
            onClick={() => { setToolMode("fill"); sfx.pop(); }}
            className={cn("grid size-10 place-items-center rounded-xl border transition", toolMode === "fill" ? "border-transparent bg-grad text-white" : "border-border bg-card hover:bg-accent-soft")}
          >
            <PaintBucket className="size-5" />
          </button>

          <span className="mx-1 hidden h-8 w-px bg-border sm:block" />

          {/* Colors */}
          <div className="grid grid-cols-11 gap-1">
            {CANVAS_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { setBrushColor(c); sfx.click(); }}
                className={cn("size-5 rounded-md border-2 transition hover:scale-110", brushColor === c ? "border-foreground scale-110" : "border-black/10")}
                style={{ background: c }}
              />
            ))}
          </div>
          <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="dd-color h-7 w-7 rounded-md" />

          <span className="mx-1 hidden h-8 w-px bg-border sm:block" />

          {/* Sizes */}
          <div className="flex items-center gap-1">
            {BRUSH_SIZES.map((n) => (
              <button
                key={n}
                onClick={() => { setBrushSize(n); sfx.click(); }}
                className={cn("grid size-10 place-items-center rounded-xl border transition", brushSize === n ? "border-transparent bg-grad text-white" : "border-border bg-card hover:bg-accent-soft")}
              >
                <span className="rounded-full" style={{ width: Math.min(14, n * 0.6), height: Math.min(14, n * 0.6), background: brushSize === n ? "white" : "var(--foreground)" }} />
              </button>
            ))}
          </div>

          <span className="mx-1 hidden h-8 w-px bg-border sm:block" />

          {/* Symmetry */}
          <div className="flex items-center gap-1">
            <button onClick={() => { setSymmetry(0); sfx.pop(); }} className={cn("grid size-10 place-items-center rounded-xl border text-xs font-bold transition", symmetry === 0 ? "border-transparent bg-grad text-white" : "border-border bg-card hover:bg-accent-soft")}>1×</button>
            <button onClick={() => { setSymmetry(1); sfx.pop(); }} className={cn("grid size-10 place-items-center rounded-xl border transition", symmetry === 1 ? "border-transparent bg-grad text-white" : "border-border bg-card hover:bg-accent-soft")}><FlipHorizontal className="size-5" /></button>
            <button onClick={() => { setSymmetry(2); sfx.pop(); }} className={cn("grid size-10 place-items-center rounded-xl border transition", symmetry === 2 ? "border-transparent bg-grad text-white" : "border-border bg-card hover:bg-accent-soft")}><FlipVertical className="size-5" /></button>
            <button onClick={() => { setSymmetry(4); sfx.pop(); }} className={cn("grid size-10 place-items-center rounded-xl border transition", symmetry === 4 ? "border-transparent bg-grad text-white" : "border-border bg-card hover:bg-accent-soft")}><Grid2x2 className="size-5" /></button>
          </div>

          <span className="mx-1 hidden h-8 w-px bg-border sm:block" />

          {/* Paper Texture */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setTexture("plain"); sfx.click(); }}
              className={cn("rounded-lg border px-2 py-1 text-xs", texture === "plain" ? "border-transparent bg-grad text-white" : "border-border hover:bg-accent-soft")}
            >
              Plain
            </button>
            <button
              onClick={() => { setTexture("dots"); sfx.click(); }}
              className={cn("rounded-lg border px-2 py-1 text-xs", texture === "dots" ? "border-transparent bg-grad text-white" : "border-border hover:bg-accent-soft")}
            >
              Dots
            </button>
            <button
              onClick={() => { setTexture("grid"); sfx.click(); }}
              className={cn("rounded-lg border px-2 py-1 text-xs", texture === "grid" ? "border-transparent bg-grad text-white" : "border-border hover:bg-accent-soft")}
            >
              Grid
            </button>
            <button
              onClick={() => { setTexture("parchment"); sfx.click(); }}
              className={cn("rounded-lg border px-2 py-1 text-xs", texture === "parchment" ? "border-transparent bg-grad text-white" : "border-border hover:bg-accent-soft")}
            >
              Parchment
            </button>
            <button
              onClick={() => { setTexture("dark"); sfx.click(); }}
              className={cn("rounded-lg border px-2 py-1 text-xs", texture === "dark" ? "border-transparent bg-grad text-white" : "border-border hover:bg-accent-soft")}
            >
              Dark
            </button>
          </div>

          <span className="mx-1 hidden h-8 w-px bg-border sm:block" />

          {/* Undo / Clear */}
          <button onClick={handleUndo} className="grid size-10 place-items-center rounded-xl border border-border bg-card transition hover:bg-accent-soft">
            <Undo2 className="size-5" />
          </button>
          <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
            <AlertDialogTrigger asChild>
              <button className="grid size-10 place-items-center rounded-xl border border-border bg-card transition hover:bg-destructive hover:text-white">
                <Trash2 className="size-5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear the canvas?</AlertDialogTitle>
                <AlertDialogDescription>This wipes everything. You can&apos;t undo this.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear} className="bg-destructive text-white hover:bg-destructive/90">Clear</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

export default PaintStudio;
