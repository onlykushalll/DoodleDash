"use client";

import { useEffect, useState } from "react";
import { Users, Copy, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGameStore } from "@/lib/game/store";
import { AVATARS } from "@/lib/game/types";
import { sfx } from "@/lib/game/sound";

function myBuddyCode(): string {
  if (typeof window === "undefined") return "";
  try {
    let code = localStorage.getItem("dd-my-buddy-code");
    if (!code) {
      code = Math.random().toString(36).slice(2, 10).toUpperCase();
      localStorage.setItem("dd-my-buddy-code", code);
    }
    return code;
  } catch {
    return "--------";
  }
}

export function BuddiesPanel({ triggerClassName }: { triggerClassName?: string }) {
  const buddies = useGameStore((s) => s.buddies);
  const addBuddy = useGameStore((s) => s.addBuddy);
  const removeBuddy = useGameStore((s) => s.removeBuddy);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [myCode] = useState(myBuddyCode);

  useEffect(() => {
    // Hydrate buddies from localStorage
    try {
      const raw = localStorage.getItem("dd-buddies");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          for (const b of arr) {
            if (!useGameStore.getState().buddies.find((x) => x.code === b.code)) {
              addBuddy(b);
            }
          }
        }
      }
    } catch { /* ignore */ }
  }, [addBuddy]);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem("dd-buddies", JSON.stringify(buddies));
    } catch { /* ignore */ }
  }, [buddies]);

  const handleAdd = () => {
    const c = code.trim().toUpperCase();
    const n = name.trim() || "Buddy";
    if (c.length < 4) { toast.error("Enter a valid buddy code"); return; }
    if (buddies.find((b) => b.code === c)) { toast.error("Already in your buddies"); return; }
    addBuddy({ code: c, name: n, avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)] });
    setCode(""); setName("");
    sfx.correct();
    toast.success(`${n} added to buddies!`);
  };

  const copyCode = () => {
    try {
      navigator.clipboard.writeText(myCode);
      sfx.pop();
      toast.success("Buddy code copied! Share it so friends can add you.");
    } catch {
      toast.error("Couldn't copy — your code is " + myCode);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={triggerClassName ?? "grid size-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-accent-soft"}
          aria-label="Buddies"
          title="Buddies"
        >
          <Users className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <h3 className="text-sm font-bold">Buddies</h3>
          </div>

          {/* My code */}
          <div className="rounded-xl border bg-surface-2/60 p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Your buddy code</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 font-mono text-base font-bold tracking-widest">{myCode}</code>
              <Button size="sm" variant="secondary" onClick={copyCode} className="h-7 px-2">
                <Copy className="size-3.5" /> Copy
              </Button>
            </div>
          </div>

          {/* Add buddy */}
          <div className="space-y-1.5">
            <Input
              placeholder="Buddy code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
              className="h-9 font-mono"
            />
            <div className="flex gap-1.5">
              <Input
                placeholder="Nickname (optional)"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 16))}
                className="h-9"
              />
              <Button size="sm" onClick={handleAdd} className="h-9 px-3">
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          {/* Buddy list */}
          {buddies.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Saved ({buddies.length})</p>
              {buddies.map((b) => (
                <div key={b.code} className="flex items-center gap-2 rounded-lg border bg-card px-2 py-1.5">
                  <span className="grid size-7 place-items-center rounded-full bg-surface-2 text-sm">{b.avatar}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold">{b.name}</div>
                    <code className="text-[10px] text-muted-foreground">{b.code}</code>
                  </div>
                  <button
                    onClick={() => { removeBuddy(b.code); sfx.click(); }}
                    className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-destructive hover:text-white"
                    aria-label={`Remove ${b.name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">No buddies yet. Add one with their code!</p>
          )}
          <p className="text-[10px] text-muted-foreground">Note: buddies are saved locally on this device. Real-time presence needs accounts (coming soon).</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default BuddiesPanel;
