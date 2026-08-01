"use client";

import { useState } from "react";
import { MessageSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/game/sound";
import { ChatPanel } from "./chat-panel";
import { Scoreboard } from "./scoreboard";
import { useGameStore, selectIsDrawer } from "@/lib/game/store";

export function SidePanel({ className }: { className?: string }) {
  const isDrawer = useGameStore(selectIsDrawer);
  const [tab, setTab] = useState<"chat" | "players">("chat");

  return (
    <div className={cn("flex h-full flex-col overflow-hidden rounded-2xl border bg-card/95 shadow-soft", className)}>
      {isDrawer ? (
        <>
          {/* Drawer: toggle between chat and players */}
          <div className="flex shrink-0 border-b border-border/60 p-1">
            <button
              onClick={() => { setTab("chat"); sfx.click(); }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition",
                tab === "chat" ? "bg-grad text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="size-3" />
              Chat
            </button>
            <button
              onClick={() => { setTab("players"); sfx.click(); }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition",
                tab === "players" ? "bg-grad text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="size-3" />
              Players
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {tab === "chat" ? (
              <ChatPanel />
            ) : (
              <div className="h-full overflow-y-auto scroll-soft p-1">
                <Scoreboard />
              </div>
            )}
          </div>
        </>
      ) : (
        /* Guesser: chat only */
        <ChatPanel />
      )}
    </div>
  );
}
