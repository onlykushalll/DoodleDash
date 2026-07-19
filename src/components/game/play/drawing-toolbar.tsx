"use client";

import { useEffect, useState } from "react";
import {
  Pen,
  Highlighter,
  Pencil,
  Sparkles,
  Eraser,
  Minus,
  Square,
  Circle,
  PaintBucket,
  Undo2,
  Trash2,
  FlipHorizontal,
  FlipVertical,
  Grid2x2,
  Volume2,
  VolumeX,
  Accessibility,
  Palette as PaletteIcon,
  type LucideIcon,
} from "lucide-react";
import { getSocket } from "@/hooks/use-game-socket";
import { useGameStore, selectIsDrawer } from "@/lib/game/store";
import {
  BRUSHES,
  BRUSH_SIZES,
  CANVAS_COLORS,
  CVD_COLORS,
  type BrushType,
  type ShapeType,
  type PaperTexture,
} from "@/lib/game/types";
import { sfx } from "@/lib/game/sound";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const BRUSH_ICONS: Record<BrushType, LucideIcon> = {
  pen: Pen,
  marker: Highlighter,
  pencil: Pencil,
  neon: Sparkles,
  eraser: Eraser,
};

const SHAPE_BUTTONS: { type: ShapeType; icon: LucideIcon; label: string }[] = [
  { type: "line", icon: Minus, label: "Line" },
  { type: "rect", icon: Square, label: "Rectangle" },
  { type: "ellipse", icon: Circle, label: "Ellipse" },
];

function Divider() {
  return <span className="mx-1 hidden h-8 w-px shrink-0 bg-border sm:block" aria-hidden />;
}

function ToolButton({
  active,
  onClick,
  label,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled}
          onClick={onClick}
          className={cn(
            "relative grid size-11 place-items-center rounded-xl border text-foreground transition-all",
            "hover:-translate-y-0.5 hover:shadow-soft active:translate-y-0",
            active
              ? "border-transparent bg-grad text-white shadow-soft"
              : "border-border bg-card hover:bg-accent-soft"
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function DrawingToolbar({ className }: { className?: string }) {
  const isDrawer = useGameStore(selectIsDrawer);
  const isPaused = useGameStore((s) => !!s.room?.paused);
  const brush = useGameStore((s) => s.brush);
  const shape = useGameStore((s) => s.shape);
  const toolMode = useGameStore((s) => s.toolMode);
  const brushColor = useGameStore((s) => s.brushColor);
  const brushSize = useGameStore((s) => s.brushSize);
  const setTool = useGameStore((s) => s.setTool);
  const setShape = useGameStore((s) => s.setShape);
  const setToolMode = useGameStore((s) => s.setToolMode);
  const setBrushColor = useGameStore((s) => s.setBrushColor);
  const setBrushSize = useGameStore((s) => s.setBrushSize);
  // new feature state
  const symmetry = useGameStore((s) => s.symmetry);
  const setSymmetry = useGameStore((s) => s.setSymmetry);
  const brushSounds = useGameStore((s) => s.brushSounds);
  const setBrushSounds = useGameStore((s) => s.setBrushSounds);
  const cvdMode = useGameStore((s) => s.cvdMode);
  const setCvdMode = useGameStore((s) => s.setCvdMode);
  const highContrast = useGameStore((s) => s.highContrast);
  const setHighContrast = useGameStore((s) => s.setHighContrast);
  const paperTexture = useGameStore((s) => s.paperTexture);
  const setPaperTexture = useGameStore((s) => s.setPaperTexture);

  const [clearOpen, setClearOpen] = useState(false);

  // Hydrate + persist canvas prefs
  useEffect(() => {
    try {
      const raw = localStorage.getItem("dd-canvas-prefs");
      if (raw) {
        const p = JSON.parse(raw);
        if (p.symmetry != null) setSymmetry(p.symmetry);
        if (p.paperTexture) setPaperTexture(p.paperTexture);
        if (typeof p.brushSounds === "boolean") setBrushSounds(p.brushSounds);
        if (p.cvdMode) setCvdMode(p.cvdMode);
        if (typeof p.highContrast === "boolean") setHighContrast(p.highContrast);
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("dd-canvas-prefs", JSON.stringify({ symmetry, paperTexture, brushSounds, cvdMode, highContrast }));
    } catch { /* ignore */ }
  }, [symmetry, paperTexture, brushSounds, cvdMode, highContrast]);

  if (!isDrawer || isPaused) return null;

  // CVD-aware palette: swap to CVD colors when cvdMode is on.
  const palette = cvdMode === "off" ? CANVAS_COLORS : CVD_COLORS;

  const handleBrush = (b: BrushType) => {
    const canvas = document.querySelector("canvas");
    if (canvas) canvas.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    setTool(b);
    setToolMode("brush");
    sfx.pop();
  };
  const handleShape = (sh: ShapeType) => {
    const canvas = document.querySelector("canvas");
    if (canvas) canvas.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    setShape(sh);
    setToolMode("shape");
    sfx.pop();
  };
  const handleFill = () => {
    const canvas = document.querySelector("canvas");
    if (canvas) canvas.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    setToolMode("fill");
    sfx.pop();
  };
  const handleColor = (c: string) => {
    setBrushColor(c);
    sfx.click();
  };
  const handleSize = (n: number) => {
    setBrushSize(n);
    sfx.click();
  };
  const handleUndo = () => {
    getSocket().emit("game:undo");
    sfx.click();
  };
  const handleClear = () => {
    getSocket().emit("game:clear");
    setClearOpen(false);
    sfx.click();
  };

  return (
    <div
      className={cn(
        "glass flex items-center gap-2 overflow-x-auto scroll-soft rounded-2xl border p-2 shadow-soft sm:flex-wrap",
        className
      )}
      role="toolbar"
      aria-label="Drawing tools"
    >
      {/* Brushes */}
      <div className="flex items-center gap-1.5">
        {BRUSHES.map((b) => {
          const Icon = BRUSH_ICONS[b.type];
          const active = toolMode === "brush" && brush === b.type;
          return (
            <ToolButton
              key={b.type}
              active={active}
              onClick={() => handleBrush(b.type)}
              label={b.label}
            >
              <Icon className="size-5" />
            </ToolButton>
          );
        })}
      </div>

      <Divider />

      {/* Shapes */}
      <div className="flex items-center gap-1.5">
        {SHAPE_BUTTONS.map((s) => {
          const Icon = s.icon;
          const active = toolMode === "shape" && shape === s.type;
          return (
            <ToolButton
              key={s.type}
              active={active}
              onClick={() => handleShape(s.type)}
              label={s.label}
            >
              <Icon className="size-5" />
            </ToolButton>
          );
        })}
      </div>

      <Divider />

      {/* Fill */}
      <ToolButton
        active={toolMode === "fill"}
        onClick={handleFill}
        label="Fill bucket"
      >
        <PaintBucket className="size-5" />
      </ToolButton>

      <Divider />

      {/* Colors (CVD-aware palette) */}
      <div className="flex flex-col items-stretch gap-1.5">
        <div className="grid grid-cols-6 gap-1 sm:grid-cols-11">
          {palette.map((c) => {
            const selected = brushColor.toLowerCase() === c.toLowerCase();
            return (
              <Tooltip key={c}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Color ${c}`}
                    aria-pressed={selected}
                    onClick={() => handleColor(c)}
                    className={cn(
                      "size-5 rounded-md border transition-all hover:scale-110",
                      selected
                        ? "border-foreground ring-2 ring-ring ring-offset-1"
                        : "border-black/10"
                    )}
                    style={{ backgroundColor: c }}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">{c}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold text-muted-foreground">
            Custom
          </label>
          <input
            type="color"
            className="dd-color size-7 rounded-md"
            value={brushColor}
            onChange={(e) => handleColor(e.target.value)}
            aria-label="Pick a custom color"
          />
        </div>
      </div>

      <Divider />

      {/* Sizes */}
      <div className="flex items-center gap-1.5">
        {BRUSH_SIZES.map((n) => {
          const active = brushSize === n;
          // Visual dot scales with size (cap at ~14px for UI)
          const dot = Math.min(14, Math.max(4, n * 0.6));
          return (
            <Tooltip key={n}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Brush size ${n}`}
                  aria-pressed={active}
                  onClick={() => handleSize(n)}
                  className={cn(
                    "grid size-11 place-items-center rounded-xl border transition-all",
                    "hover:-translate-y-0.5 hover:shadow-soft",
                    active
                      ? "border-transparent bg-grad text-white shadow-soft"
                      : "border-border bg-card hover:bg-accent-soft"
                  )}
                >
                  <span
                    className="rounded-full"
                    style={{
                      width: dot,
                      height: dot,
                      backgroundColor: active ? "white" : "var(--foreground)",
                    }}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">{n}px</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <Divider />

      {/* Undo / Clear */}
      <div className="flex items-center gap-1.5">
        <ToolButton active={false} onClick={handleUndo} label="Undo">
          <Undo2 className="size-5" />
        </ToolButton>
        <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  aria-label="Clear canvas"
                  className={cn(
                    "grid size-11 place-items-center rounded-xl border border-border bg-card text-foreground transition-all",
                    "hover:-translate-y-0.5 hover:bg-destructive hover:text-white hover:shadow-soft"
                  )}
                >
                  <Trash2 className="size-5" />
                </button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">Clear canvas</TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear the whole canvas?</AlertDialogTitle>
              <AlertDialogDescription>
                This wipes everything for everyone in the room. You can&apos;t undo this.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClear}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Clear
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Divider />

      {/* Symmetry */}
      <div className="flex items-center gap-1.5">
        <ToolButton active={symmetry === 0} onClick={() => { setSymmetry(0); sfx.pop(); }} label="Symmetry off">
          <span className="text-xs font-bold">1×</span>
        </ToolButton>
        <ToolButton active={symmetry === 1} onClick={() => { setSymmetry(1); sfx.pop(); }} label="Horizontal mirror">
          <FlipHorizontal className="size-5" />
        </ToolButton>
        <ToolButton active={symmetry === 2} onClick={() => { setSymmetry(2); sfx.pop(); }} label="Vertical mirror">
          <FlipVertical className="size-5" />
        </ToolButton>
        <ToolButton active={symmetry === 4} onClick={() => { setSymmetry(4); sfx.pop(); }} label="4-way kaleidoscope">
          <Grid2x2 className="size-5" />
        </ToolButton>
      </div>

      <Divider />

      {/* Brush sounds toggle */}
      <ToolButton active={brushSounds} onClick={() => { setBrushSounds(!brushSounds); sfx.pop(); }} label={brushSounds ? "Brush sounds on" : "Brush sounds off"}>
        {brushSounds ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
      </ToolButton>

      {/* Paper texture popover */}
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Paper texture"
                className="grid size-11 place-items-center rounded-xl border border-border bg-card text-foreground transition-all hover:-translate-y-0.5 hover:shadow-soft"
              >
                <PaletteIcon className="size-5" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">Paper texture</TooltipContent>
        </Tooltip>
        <PopoverContent align="end" className="w-52">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Paper texture</p>
            {(["plain", "dots", "grid", "parchment", "dark"] as PaperTexture[]).map((t) => (
              <button
                key={t}
                onClick={() => { setPaperTexture(t); sfx.click(); }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium capitalize transition",
                  paperTexture === t ? "border-transparent bg-grad text-white" : "border-border hover:bg-accent-soft"
                )}
              >
                {t}
                {paperTexture === t && <span>✓</span>}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Accessibility popover */}
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Accessibility settings"
                className="grid size-11 place-items-center rounded-xl border border-border bg-card text-foreground transition-all hover:-translate-y-0.5 hover:shadow-soft"
              >
                <Accessibility className="size-5" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">Accessibility</TooltipContent>
        </Tooltip>
        <PopoverContent align="end" className="w-64">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Color-blind palette</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(["off", "deutan", "protan", "tritan"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setCvdMode(m); sfx.click(); }}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-xs font-medium capitalize transition",
                      cvdMode === m ? "border-transparent bg-grad text-white" : "border-border hover:bg-accent-soft"
                    )}
                  >
                    {m === "off" ? "Off" : m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="hc" className="text-sm font-medium">High contrast</Label>
              <Switch id="hc" checked={highContrast} onCheckedChange={(v) => { setHighContrast(v); sfx.pop(); }} />
            </div>
            <p className="text-[11px] text-muted-foreground">Thicker strokes + distinct patterns per brush for better visibility.</p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
