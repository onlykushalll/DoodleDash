"use client";

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
  type LucideIcon,
} from "lucide-react";
import { useGameStore, selectIsDrawer } from "@/lib/game/store";
import { getSocket } from "@/hooks/use-game-socket";
import {
  BRUSHES,
  BRUSH_SIZES,
  CANVAS_COLORS,
  CVD_COLORS,
  type BrushType,
  type ShapeType,
} from "@/lib/game/types";
import { sfx } from "@/lib/game/sound";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
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

const BRUSH_ICONS: Record<BrushType, LucideIcon> = {
  pen: Pen,
  marker: Highlighter,
  pencil: Pencil,
  neon: Sparkles,
  eraser: Eraser,
};

const SHAPE_ICONS: { type: ShapeType; icon: LucideIcon }[] = [
  { type: "line", icon: Minus },
  { type: "rect", icon: Square },
  { type: "ellipse", icon: Circle },
];

function VBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg border transition-all",
        active
          ? "border-transparent bg-grad text-white shadow-soft"
          : "border-border bg-card hover:bg-accent-soft text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function VerticalToolbar({ className }: { className?: string }) {
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
  const cvdMode = useGameStore((s) => s.cvdMode);
  const [clearOpen, setClearOpen] = useState(false);

  if (!isDrawer || isPaused) return null;

  const palette = cvdMode === "off" ? CANVAS_COLORS : CVD_COLORS;
  const topColors = palette.slice(0, 11);
  const bottomColors = palette.slice(11, 22);

  const handleBrush = (b: BrushType) => {
    setTool(b);
    setToolMode("brush");
    sfx.pop();
  };
  const handleShape = (sh: ShapeType) => {
    setShape(sh);
    setToolMode("shape");
    sfx.pop();
  };
  const handleFill = () => {
    setToolMode("fill");
    sfx.pop();
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
        "glass flex h-full flex-col items-center gap-1 rounded-2xl border p-1 shadow-soft",
        className
      )}
      role="toolbar"
      aria-label="Drawing tools"
    >
      <ScrollArea className="h-full w-full scroll-soft">
        <div className="flex flex-col items-center gap-1 py-1">
          {/* Brushes */}
          {BRUSHES.map((b) => {
            const Icon = BRUSH_ICONS[b.type];
            return (
              <VBtn
                key={b.type}
                active={toolMode === "brush" && brush === b.type}
                onClick={() => handleBrush(b.type)}
                label={b.label}
              >
                <Icon className="size-4" />
              </VBtn>
            );
          })}

          <span className="my-0.5 h-px w-6 bg-border" aria-hidden />

          {/* Shapes + Fill */}
          {SHAPE_ICONS.map((s) => {
            const Icon = s.icon;
            return (
              <VBtn
                key={s.type}
                active={toolMode === "shape" && shape === s.type}
                onClick={() => handleShape(s.type)}
                label={s.type}
              >
                <Icon className="size-4" />
              </VBtn>
            );
          })}
          <VBtn active={toolMode === "fill"} onClick={handleFill} label="Fill">
            <PaintBucket className="size-4" />
          </VBtn>

          <span className="my-0.5 h-px w-6 bg-border" aria-hidden />

          {/* Sizes */}
          {BRUSH_SIZES.map((n) => {
            const dot = Math.min(10, Math.max(3, n * 0.4));
            return (
              <VBtn
                key={n}
                active={brushSize === n}
                onClick={() => { setBrushSize(n); sfx.click(); }}
                label={`${n}px`}
              >
                <span
                  className="rounded-full"
                  style={{
                    width: dot,
                    height: dot,
                    backgroundColor: brushSize === n ? "white" : "var(--foreground)",
                  }}
                />
              </VBtn>
            );
          })}

          <span className="my-0.5 h-px w-6 bg-border" aria-hidden />

          {/* Quick colors (2 rows × 6) */}
          <div className="grid grid-cols-2 gap-0.5">
            {topColors.slice(0, 6).map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => { setBrushColor(c); sfx.click(); }}
                className={cn(
                  "size-4 rounded-sm border transition-all",
                  brushColor.toLowerCase() === c.toLowerCase()
                    ? "border-foreground ring-1 ring-ring"
                    : "border-black/10"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-0.5">
            {bottomColors.slice(0, 6).map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => { setBrushColor(c); sfx.click(); }}
                className={cn(
                  "size-4 rounded-sm border transition-all",
                  brushColor.toLowerCase() === c.toLowerCase()
                    ? "border-foreground ring-1 ring-ring"
                    : "border-black/10"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <input
            type="color"
            className="dd-color mt-0.5 size-7 rounded-md"
            value={brushColor}
            onChange={(e) => { setBrushColor(e.target.value); sfx.click(); }}
            aria-label="Custom color"
          />

          <span className="my-0.5 h-px w-6 bg-border" aria-hidden />

          {/* Undo / Clear */}
          <VBtn active={false} onClick={handleUndo} label="Undo">
            <Undo2 className="size-4" />
          </VBtn>
          <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label="Clear canvas"
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-foreground transition-all hover:bg-destructive hover:text-white"
              >
                <Trash2 className="size-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear the whole canvas?</AlertDialogTitle>
                <AlertDialogDescription>
                  This wipes everything for everyone. You can&apos;t undo this.
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
      </ScrollArea>
    </div>
  );
}
