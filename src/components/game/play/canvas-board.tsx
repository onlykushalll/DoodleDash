"use client";

import { useCallback, useEffect, useRef } from "react";
import { getSocket } from "@/hooks/use-game-socket";
import { useGameStore, selectIsDrawer } from "@/lib/game/store";
import type {
  BrushType,
  Point,
  ShapeStroke,
  ShapeType,
  Stroke,
  PaperTexture,
} from "@/lib/game/types";
import { brushScratch } from "@/lib/game/sound";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
const LOGICAL_W = 1200;
const LOGICAL_H = 720; // 5:3 aspect ratio

type CanvasItem =
  | { kind: "stroke"; stroke: Stroke }
  | { kind: "shape"; shape: ShapeStroke };

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function makeId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* noop */
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function hexToRgba(hex: string): [number, number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (h.length !== 6) return [0, 0, 0, 255];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [
    Number.isNaN(r) ? 0 : r,
    Number.isNaN(g) ? 0 : g,
    Number.isNaN(b) ? 0 : b,
    255,
  ];
}

function applyBrushStyle(
  ctx: CanvasRenderingContext2D,
  brush: BrushType,
  color: string,
  size: number
) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.globalCompositeOperation = "source-over";
  switch (brush) {
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

function strokePath(ctx: CanvasRenderingContext2D, pts: Point[]) {
  const W = LOGICAL_W;
  const H = LOGICAL_H;
  if (pts.length === 0) return;
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(
      pts[0].x * W,
      pts[0].y * H,
      Math.max(0.5, ctx.lineWidth / 2),
      0,
      Math.PI * 2
    );
    ctx.stroke();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x * W, pts[0].y * H);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = ((pts[i].x + pts[i + 1].x) / 2) * W;
    const my = ((pts[i].y + pts[i + 1].y) / 2) * H;
    ctx.quadraticCurveTo(pts[i].x * W, pts[i].y * H, mx, my);
  }
  ctx.lineTo(pts[pts.length - 1].x * W, pts[pts.length - 1].y * H);
  ctx.stroke();
}

interface DrawOpts {
  highContrast?: boolean;
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, opts: DrawOpts = {}) {
  if (stroke.points.length === 0) return;
  const sizeMult = opts.highContrast ? 1.5 : 1;
  if (stroke.brush === "neon") {
    applyBrushStyle(ctx, "neon", stroke.color, stroke.size * sizeMult);
    strokePath(ctx, stroke.points);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(1, stroke.size * sizeMult * 0.25);
    ctx.globalAlpha = 0.9;
    strokePath(ctx, stroke.points);
    ctx.globalAlpha = 1;
    return;
  }
  applyBrushStyle(ctx, stroke.brush, stroke.color, stroke.size * sizeMult);
  // High-contrast patterns per brush
  if (opts.highContrast) {
    if (stroke.brush === "marker") ctx.setLineDash([12, 6]);
    else if (stroke.brush === "pencil") ctx.setLineDash([2, 5]);
    else ctx.setLineDash([]);
  } else {
    ctx.setLineDash([]);
  }
  strokePath(ctx, stroke.points);
  ctx.setLineDash([]); // reset
}

function drawShape(ctx: CanvasRenderingContext2D, shape: ShapeStroke, opts: DrawOpts = {}) {
  const W = LOGICAL_W;
  const H = LOGICAL_H;
  const sizeMult = opts.highContrast ? 1.5 : 1;
  applyBrushStyle(ctx, "pen", shape.color, shape.size * sizeMult);
  const sx = shape.start.x * W;
  const sy = shape.start.y * H;
  const ex = shape.end.x * W;
  const ey = shape.end.y * H;
  ctx.beginPath();
  switch (shape.kind) {
    case "line":
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      break;
    case "rect":
      ctx.rect(Math.min(sx, ex), Math.min(sy, ey), Math.abs(ex - sx), Math.abs(ey - sy));
      ctx.stroke();
      break;
    case "ellipse": {
      const cx = (sx + ex) / 2;
      const cy = (sy + ey) / 2;
      const rx = Math.abs(ex - sx) / 2;
      const ry = Math.abs(ey - sy) / 2;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }
}

function drawItem(ctx: CanvasRenderingContext2D, item: CanvasItem, opts: DrawOpts = {}) {
  if (item.kind === "stroke") drawStroke(ctx, item.stroke, opts);
  else drawShape(ctx, item.shape, opts);
}

/** Flood fill on the canvas bitmap at normalized (x,y) with `color`. */
function floodFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fillHex: string,
  w: number,
  h: number
) {
  if (w <= 0 || h <= 0) return;
  let img: ImageData;
  try {
    img = ctx.getImageData(0, 0, w, h);
  } catch {
    return; // CORS or other issue
  }
  const data = img.data;
  const px = Math.max(0, Math.min(w - 1, Math.floor(x * w)));
  const py = Math.max(0, Math.min(h - 1, Math.floor(y * h)));
  const idx0 = (py * w + px) * 4;
  const tr = data[idx0];
  const tg = data[idx0 + 1];
  const tb = data[idx0 + 2];
  const ta = data[idx0 + 3];
  const [fr, fg, fb, fa] = hexToRgba(fillHex);
  if (tr === fr && tg === fg && tb === fb && ta === fa) return;
  const tol = 8;
  const matches = (i: number) =>
    Math.abs(data[i] - tr) <= tol &&
    Math.abs(data[i + 1] - tg) <= tol &&
    Math.abs(data[i + 2] - tb) <= tol &&
    Math.abs(data[i + 3] - ta) <= tol;
  // Iterative flood fill using a flat (x,y) stack.
  const stack: number[] = [px, py];
  while (stack.length >= 2) {
    const cy = stack.pop() as number;
    const cx = stack.pop() as number;
    if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
    const i = (cy * w + cx) * 4;
    if (!matches(i)) continue;
    data[i] = fr;
    data[i + 1] = fg;
    data[i + 2] = fb;
    data[i + 3] = fa;
    stack.push(cx + 1, cy);
    stack.push(cx - 1, cy);
    stack.push(cx, cy + 1);
    stack.push(cx, cy - 1);
  }
  ctx.putImageData(img, 0, 0);
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export function CanvasBoard({
  className,
  texture,
}: {
  className?: string;
  texture?: PaperTexture; // optional override; falls back to store.paperTexture
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dprRef = useRef(1);

  // Live drawing state (in refs to avoid re-renders)
  const historyRef = useRef<CanvasItem[]>([]);
  const fillsRef = useRef<{ x: number; y: number; color: string }[]>([]);
  const liveStrokeRef = useRef<Stroke | null>(null);
  const previewShapeRef = useRef<ShapeStroke | null>(null);
  const remoteStrokesRef = useRef<Map<string, Stroke>>(new Map());
  const isDrawingRef = useRef(false);
  const shapeStartRef = useRef<Point | null>(null);
  const lastEmitRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const myIdsRef = useRef<Set<string>>(new Set());

  const isDrawer = useGameStore(selectIsDrawer);
  const toolMode = useGameStore((s) => s.toolMode);
  const isPaused = useGameStore((s) => !!s.room?.paused);
  // Read feature prefs from store (with sensible fallbacks)
  const storeTexture = useGameStore((s) => s.paperTexture);
  const symmetry = useGameStore((s) => s.symmetry);
  const brushSounds = useGameStore((s) => s.brushSounds);
  const highContrast = useGameStore((s) => s.highContrast);
  const effectiveTexture = texture ?? storeTexture;

  // ---- Rendering (declared first; used by setupCanvas) ----
  const syncBaseFromHistory = useCallback(() => {
    const base = baseCanvasRef.current;
    const bctx = base?.getContext("2d");
    if (!base || !bctx) return;
    bctx.save();
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    // Dark texture → dark canvas background; else white.
    bctx.fillStyle = effectiveTexture === "dark" ? "#1a1a2e" : "#ffffff";
    bctx.fillRect(0, 0, base.width, base.height);
    bctx.restore();
    for (const item of historyRef.current) drawItem(bctx, item, { highContrast });
    // Re-apply recorded fills
    for (const f of fillsRef.current) {
      floodFill(bctx, f.x, f.y, f.color, base.width, base.height);
    }
  }, [effectiveTexture, highContrast]);

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const base = baseCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !base || !ctx) return;
    // Draw base onto visible canvas (device-pixel space)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    ctx.restore();
    // Re-apply dpr scale for subsequent drawing (logical units)
    const dpr = dprRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    if (liveStrokeRef.current) drawStroke(ctx, liveStrokeRef.current, { highContrast });
    if (previewShapeRef.current) drawShape(ctx, previewShapeRef.current, { highContrast });
    for (const s of remoteStrokesRef.current.values()) drawStroke(ctx, s, { highContrast });
  }, [highContrast]);

  const scheduleRender = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      renderFrame();
    });
  }, [renderFrame]);

  // ---- Commit & sync helpers ----
  const commitToBase = useCallback((item: CanvasItem) => {
    const base = baseCanvasRef.current;
    const bctx = base?.getContext("2d");
    if (!bctx) return;
    drawItem(bctx, item, { highContrast });
  }, [highContrast]);

  const copyVisibleToBase = useCallback(() => {
    const canvas = canvasRef.current;
    const base = baseCanvasRef.current;
    const bctx = base?.getContext("2d");
    if (!canvas || !base || !bctx) return;
    bctx.save();
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, base.width, base.height);
    bctx.drawImage(canvas, 0, 0);
    bctx.restore();
    const dpr = dprRef.current;
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.scale(dpr, dpr);
  }, []);

  // ---- Canvas setup (DPR + sizing) ----
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(
      1,
      Math.min(3, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)
    );
    dprRef.current = dpr;
    const backingW = Math.round(LOGICAL_W * dpr);
    const backingH = Math.round(LOGICAL_H * dpr);
    if (canvas.width !== backingW || canvas.height !== backingH) {
      canvas.width = backingW;
      canvas.height = backingH;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    if (!baseCanvasRef.current) {
      baseCanvasRef.current = document.createElement("canvas");
    }
    const base = baseCanvasRef.current;
    if (base.width !== backingW || base.height !== backingH) {
      base.width = backingW;
      base.height = backingH;
    }
    const bctx = base.getContext("2d");
    if (!bctx) return;
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.scale(dpr, dpr);
    // Re-sync base from history (resize wipes bitmap content)
    syncBaseFromHistory();
    renderFrame();
  }, [renderFrame, syncBaseFromHistory]);

  // ---- Pointer helpers ----
  const getNormalizedPoint = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      return {
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
      };
    },
    []
  );

  // ---- Drawing handlers (drawer only) ----
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!useGameStore.getState().room) return;
      const drawer = selectIsDrawer(useGameStore.getState());
      if (!drawer) return;
      e.preventDefault();
      try {
        (e.target as Element).setPointerCapture?.(e.pointerId);
      } catch {
        /* noop */
      }
      const p = getNormalizedPoint(e);
      if (!p) return;
      const state = useGameStore.getState();
      const mode = state.toolMode;
      const socket = getSocket();

      if (mode === "fill") {
        const color = state.brush === "eraser" ? "#ffffff" : state.brushColor;
        // Ensure visible = base (no live state for fill)
        renderFrame();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) {
          floodFill(ctx, p.x, p.y, color, canvas.width, canvas.height);
          copyVisibleToBase();
        }
        // Record fill so it survives undo / resize / re-renders.
        fillsRef.current.push({ x: p.x, y: p.y, color });
        socket.emit("game:fill", { x: p.x, y: p.y, color });
        return;
      }

      if (mode === "shape") {
        isDrawingRef.current = true;
        shapeStartRef.current = p;
        const shapeKind: ShapeType = state.shape;
        const shape: ShapeStroke = {
          id: makeId(),
          kind: shapeKind,
          color: state.brush === "eraser" ? "#ffffff" : state.brushColor,
          size: state.brushSize,
          start: p,
          end: p,
        };
        previewShapeRef.current = shape;
        scheduleRender();
        return;
      }

      // brush mode
      isDrawingRef.current = true;
      const strokeId = makeId();
      const color = state.brush === "eraser" ? "#ffffff" : state.brushColor;
      const stroke: Stroke = {
        id: strokeId,
        color,
        size: state.brushSize,
        brush: state.brush,
        points: [p],
      };
      liveStrokeRef.current = stroke;
      myIdsRef.current.add(strokeId);
      socket.emit("game:stroke-start", {
        strokeId,
        color,
        size: stroke.size,
        brush: stroke.brush,
        x: p.x,
        y: p.y,
      });
      lastEmitRef.current = performance.now();
      scheduleRender();
    },
    [copyVisibleToBase, getNormalizedPoint, renderFrame, scheduleRender]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      const state = useGameStore.getState();
      const mode = state.toolMode;
      const p = getNormalizedPoint(e);
      if (!p) return;
      const socket = getSocket();

      if (mode === "shape") {
        const start = shapeStartRef.current;
        const preview = previewShapeRef.current;
        if (!start || !preview) return;
        preview.end = p;
        scheduleRender();
        return;
      }

      // brush mode
      const stroke = liveStrokeRef.current;
      if (!stroke) return;
      const last = stroke.points[stroke.points.length - 1];
      // Ignore tiny moves to reduce noise
      if (Math.abs(p.x - last.x) < 0.0015 && Math.abs(p.y - last.y) < 0.0015)
        return;
      stroke.points.push(p);
      scheduleRender();
      // ASMR brush sound (throttled inside brushScratch)
      if (useGameStore.getState().brushSounds) {
        brushScratch(stroke.brush);
      }
      // Throttle emit to ~33ms (~30 fps)
      const now = performance.now();
      if (now - lastEmitRef.current >= 33) {
        socket.emit("game:stroke-point", {
          strokeId: stroke.id,
          x: p.x,
          y: p.y,
        });
        lastEmitRef.current = now;
      }
    },
    [getNormalizedPoint, scheduleRender]
  );

  const finishStroke = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const state = useGameStore.getState();
    const mode = state.toolMode;
    const socket = getSocket();

    if (mode === "shape") {
      const preview = previewShapeRef.current;
      shapeStartRef.current = null;
      previewShapeRef.current = null;
      if (preview) {
        const item: CanvasItem = { kind: "shape", shape: preview };
        historyRef.current.push(item);
        commitToBase(item);
        myIdsRef.current.add(preview.id);
        socket.emit("game:shape", { shape: preview });
      }
      scheduleRender();
      return;
    }

    // brush mode
    const stroke = liveStrokeRef.current;
    liveStrokeRef.current = null;
    if (stroke) {
      const last = stroke.points[stroke.points.length - 1];
      socket.emit("game:stroke-point", { strokeId: stroke.id, x: last.x, y: last.y });
      socket.emit("game:stroke-end", { strokeId: stroke.id });
      const item: CanvasItem = { kind: "stroke", stroke };
      historyRef.current.push(item);
      commitToBase(item);

      // ---- Symmetry: emit mirrored copies as additional strokes ----
      const sym = useGameStore.getState().symmetry;
      if (sym > 0 && stroke.brush !== "eraser" && stroke.points.length > 0) {
        const mirrors: Point[][] = [];
        if (sym === 1) mirrors.push(stroke.points.map((pt) => ({ x: 1 - pt.x, y: pt.y })));
        else if (sym === 2) mirrors.push(stroke.points.map((pt) => ({ x: pt.x, y: 1 - pt.y })));
        else if (sym === 4) {
          mirrors.push(stroke.points.map((pt) => ({ x: 1 - pt.x, y: pt.y })));
          mirrors.push(stroke.points.map((pt) => ({ x: pt.x, y: 1 - pt.y })));
          mirrors.push(stroke.points.map((pt) => ({ x: 1 - pt.x, y: 1 - pt.y })));
        }
        for (const mpts of mirrors) {
          const mid = makeId();
          const mstroke: Stroke = { id: mid, color: stroke.color, size: stroke.size, brush: stroke.brush, points: mpts };
          myIdsRef.current.add(mid);
          // emit start (first point), all middle points, end
          socket.emit("game:stroke-start", { strokeId: mid, color: mstroke.color, size: mstroke.size, brush: mstroke.brush, x: mpts[0].x, y: mpts[0].y });
          for (let i = 1; i < mpts.length; i++) {
            socket.emit("game:stroke-point", { strokeId: mid, x: mpts[i].x, y: mpts[i].y });
          }
          socket.emit("game:stroke-end", { strokeId: mid });
          const mitem: CanvasItem = { kind: "stroke", stroke: mstroke };
          historyRef.current.push(mitem);
          commitToBase(mitem);
        }
      }
    }
    scheduleRender();
  }, [commitToBase, scheduleRender]);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch {
        /* noop */
      }
      finishStroke();
    },
    [finishStroke]
  );

  const handlePointerCancel = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    liveStrokeRef.current = null;
    previewShapeRef.current = null;
    shapeStartRef.current = null;
    scheduleRender();
  }, [scheduleRender]);

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isDrawingRef.current && e.buttons === 0) {
        finishStroke();
      }
    },
    [finishStroke]
  );

  // ---- Socket listeners (attach once) ----
  useEffect(() => {
    const socket = getSocket();

    const onStrokeStart = (payload: {
      strokeId: string;
      color: string;
      size: number;
      brush: BrushType;
      x: number;
      y: number;
    }) => {
      if (myIdsRef.current.has(payload.strokeId)) return; // my own echo
      const stroke: Stroke = {
        id: payload.strokeId,
        color: payload.color,
        size: payload.size,
        brush: payload.brush,
        points: [{ x: payload.x, y: payload.y }],
      };
      remoteStrokesRef.current.set(stroke.id, stroke);
      scheduleRender();
    };
    const onStrokePoint = (payload: {
      strokeId: string;
      x: number;
      y: number;
    }) => {
      if (myIdsRef.current.has(payload.strokeId)) return;
      const stroke = remoteStrokesRef.current.get(payload.strokeId);
      if (!stroke) return;
      stroke.points.push({ x: payload.x, y: payload.y });
      scheduleRender();
    };
    const onStrokeEnd = (payload: { strokeId: string }) => {
      if (myIdsRef.current.has(payload.strokeId)) {
        // My own echo: drop from myIds (prune) so the set doesn't grow forever.
        myIdsRef.current.delete(payload.strokeId);
        return;
      }
      const stroke = remoteStrokesRef.current.get(payload.strokeId);
      if (!stroke) return;
      remoteStrokesRef.current.delete(payload.strokeId);
      historyRef.current.push({ kind: "stroke", stroke });
      commitToBase({ kind: "stroke", stroke });
      scheduleRender();
    };
    const onShape = (payload: { shape: ShapeStroke }) => {
      if (myIdsRef.current.has(payload.shape.id)) {
        myIdsRef.current.delete(payload.shape.id);
        return;
      }
      const item: CanvasItem = { kind: "shape", shape: payload.shape };
      historyRef.current.push(item);
      commitToBase(item);
      scheduleRender();
    };
    const onFill = (payload: { x: number; y: number; color: string }) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      // Ensure visible reflects latest committed state first
      renderFrame();
      floodFill(ctx, payload.x, payload.y, payload.color, canvas.width, canvas.height);
      copyVisibleToBase();
      // Record so the fill survives undo / resize / re-renders. Duplicates
      // (drawer local + echo) are idempotent because floodFill short-circuits
      // when target color already equals fill color.
      fillsRef.current.push({ x: payload.x, y: payload.y, color: payload.color });
    };
    const onUndo = () => {
      const popped = historyRef.current.pop();
      if (!popped) return;
      syncBaseFromHistory();
      scheduleRender();
    };
    const onClear = () => {
      historyRef.current = [];
      fillsRef.current = [];
      remoteStrokesRef.current.clear();
      liveStrokeRef.current = null;
      previewShapeRef.current = null;
      isDrawingRef.current = false;
      syncBaseFromHistory();
      scheduleRender();
    };
    const onCanvas = (payload: { strokes: Stroke[]; shapes: ShapeStroke[] }) => {
      // Late-join snapshot. We don't know exact interleaving, so we put shapes
      // first then strokes. Server can later send an explicitly ordered list.
      // Note: fills are not part of the snapshot — fillsRef is cleared.
      const items: CanvasItem[] = [];
      for (const s of payload.shapes) items.push({ kind: "shape", shape: s });
      for (const s of payload.strokes) items.push({ kind: "stroke", stroke: s });
      historyRef.current = items;
      fillsRef.current = [];
      remoteStrokesRef.current.clear();
      liveStrokeRef.current = null;
      previewShapeRef.current = null;
      syncBaseFromHistory();
      scheduleRender();
    };

    socket.on("game:stroke-start", onStrokeStart);
    socket.on("game:stroke-point", onStrokePoint);
    socket.on("game:stroke-end", onStrokeEnd);
    socket.on("game:shape", onShape);
    socket.on("game:fill", onFill);
    socket.on("game:undo", onUndo);
    socket.on("game:clear", onClear);
    socket.on("game:canvas", onCanvas);

    return () => {
      socket.off("game:stroke-start", onStrokeStart);
      socket.off("game:stroke-point", onStrokePoint);
      socket.off("game:stroke-end", onStrokeEnd);
      socket.off("game:shape", onShape);
      socket.off("game:fill", onFill);
      socket.off("game:undo", onUndo);
      socket.off("game:clear", onClear);
      socket.off("game:canvas", onCanvas);
    };
  }, [
    commitToBase,
    copyVisibleToBase,
    renderFrame,
    scheduleRender,
    syncBaseFromHistory,
  ]);

  // ---- Initial setup + resize ----
  useEffect(() => {
    setupCanvas();
    const onResize = () => setupCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setupCanvas]);

  // ---- Clear canvas on new turn / new round (safety; the server's
  //      game:canvas snapshot, if any, will overwrite afterwards). ----
  const drawerRef = useRef<string | null>(null);
  const roundRef = useRef<number | null>(null);
  useEffect(() => {
    const unsub = useGameStore.subscribe((s) => {
      const room = s.room;
      if (!room) return;
      const drawerChanged =
        room.currentDrawerId !== drawerRef.current;
      const roundChanged = room.currentRound !== roundRef.current;
      if (
        (room.stage === "drawing" || room.stage === "choosing") &&
        (drawerChanged || roundChanged)
      ) {
        drawerRef.current = room.currentDrawerId;
        roundRef.current = room.currentRound;
        historyRef.current = [];
        fillsRef.current = [];
        remoteStrokesRef.current.clear();
        liveStrokeRef.current = null;
        previewShapeRef.current = null;
        isDrawingRef.current = false;
        myIdsRef.current.clear();
        syncBaseFromHistory();
        scheduleRender();
      }
    });
    return () => unsub();
  }, [scheduleRender, syncBaseFromHistory]);

  // ---- Cursor based on tool ----
  const cursorClass =
    !isDrawer || isPaused || toolMode === "fill"
      ? "cursor-default"
      : "cursor-crosshair";

  const textureClass =
    effectiveTexture === "dots"
      ? "canvas-dots"
      : effectiveTexture === "grid"
      ? "canvas-grid"
      : "";

  // Dark texture → dark wrapper; parchment → warm cream wrapper.
  const wrapperBg =
    effectiveTexture === "dark"
      ? "#1a1a2e"
      : effectiveTexture === "parchment"
      ? "#f5ecd9"
      : "#ffffff";

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl shadow-soft",
        textureClass,
        className
      )}
      style={{ aspectRatio: `${LOGICAL_W} / ${LOGICAL_H}`, background: wrapperBg }}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "block h-full w-full touch-none select-none",
          cursorClass,
          isDrawer && !isPaused ? "pointer-events-auto" : "pointer-events-none"
        )}
        style={{ touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        aria-label="Drawing canvas"
        role="img"
      />
    </div>
  );
}
