"use client";

import { Lock, Crown, Settings2, Clock, Repeat, Gauge } from "lucide-react";
import { useGameStore, selectIsHost } from "@/lib/game/store";
import { getSocket } from "@/hooks/use-game-socket";
import { sfx } from "@/lib/game/sound";
import type { WordDifficulty } from "@/lib/game/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

const ROUND_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20];
const DRAW_TIME_OPTIONS = [30, 60, 80, 120, 150];
const DIFFICULTY_OPTIONS: { value: WordDifficulty; label: string; emoji: string }[] = [
  { value: "easy", label: "Easy", emoji: "🌱" },
  { value: "medium", label: "Medium", emoji: "⚡" },
  { value: "hard", label: "Hard", emoji: "🔥" },
  { value: "mixed", label: "Mixed", emoji: "🎲" },
];

export function SettingsPanel() {
  const room = useGameStore((s) => s.room);
  const isHost = useGameStore(selectIsHost);

  if (!room) return null;
  const { settings } = room;

  const updateSettings = (partial: Partial<typeof settings>) => {
    if (!isHost) return;
    sfx.click();
    getSocket().emit("room:update-settings", { settings: partial });
  };

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary" />
            Game Settings
          </CardTitle>
          {isHost ? (
            <Badge className="gap-1">
              <Crown className="h-3 w-3" />
              Host
            </Badge>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="cursor-help gap-1">
                  <Lock className="h-3 w-3" />
                  Locked
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Only the host can change settings</TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Rounds */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
            Rounds
          </label>
          <Select
            value={String(settings.rounds)}
            onValueChange={(v) => updateSettings({ rounds: Number(v) })}
            disabled={!isHost}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROUND_OPTIONS.map((r) => (
                <SelectItem key={r} value={String(r)}>
                  {r} {r === 1 ? "round" : "rounds"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Draw time */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            Draw Time
          </label>
          <Select
            value={String(settings.drawTime)}
            onValueChange={(v) => updateSettings({ drawTime: Number(v) })}
            disabled={!isHost}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DRAW_TIME_OPTIONS.map((t) => (
                <SelectItem key={t} value={String(t)}>
                  {t} seconds
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Difficulty */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
            Difficulty
          </label>
          <ToggleGroup
            type="single"
            value={settings.difficulty}
            onValueChange={(v) => {
              if (v) updateSettings({ difficulty: v as WordDifficulty });
            }}
            disabled={!isHost}
            variant="outline"
            className="flex w-full"
          >
            {DIFFICULTY_OPTIONS.map((d) => (
              <ToggleGroupItem
                key={d.value}
                value={d.value}
                aria-label={d.label}
                className="flex-1 gap-1 px-1"
              >
                <span aria-hidden>{d.emoji}</span>
                <span className="hidden text-xs sm:inline">{d.label}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </CardContent>
    </Card>
  );
}

export default SettingsPanel;
