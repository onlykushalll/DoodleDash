"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Users } from "lucide-react";
import { useGameStore } from "@/lib/game/store";
import { ChatPanel } from "./chat-panel";
import { Scoreboard } from "./scoreboard";
import { sfx } from "@/lib/game/sound";
import { cn } from "@/lib/utils";

export function MobileChatOrb() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "players">("chat");
  const [unread, setUnread] = useState(0);
  const chat = useGameStore((s) => s.room?.chat ?? []);
  const meId = useGameStore((s) => s.meId);
  const prevLen = useRef(chat.length);
  const wasOpen = useRef(false);

  // Track unread messages
  useEffect(() => {
    if (chat.length > prevLen.current) {
      const newMsgs = chat.slice(prevLen.current);
      const hasNewFromOthers = newMsgs.some((m) => m.playerId !== meId);
      if (hasNewFromOthers && !wasOpen.current) {
        setUnread((u) => u + newMsgs.filter((m) => m.playerId !== meId).length);
      }
    }
    prevLen.current = chat.length;
  }, [chat, meId]);



  return (
    <>
      {/* Floating orb (bottom-right, above toolbar) */}
      <div className="absolute bottom-3 right-3 z-30 lg:hidden">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setOpen((v) => {
              const nextOpen = !v;
              if (nextOpen) {
                setUnread(0);
                wasOpen.current = true;
              } else {
                wasOpen.current = false;
              }
              return nextOpen;
            });
            sfx.click();
          }}
          className="relative grid h-14 w-14 place-items-center rounded-full bg-grad text-white shadow-float"
          aria-label="Open chat"
        >
          <MessageSquare className="h-6 w-6" />
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-red-500 px-1 text-xs font-bold text-white"
            >
              {unread > 99 ? "99+" : unread}
            </motion.span>
          )}
        </motion.button>
      </div>

      {/* Slide-up panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setOpen(false); wasOpen.current = false; sfx.click(); }}
              className="absolute inset-0 z-40 bg-black/30 lg:hidden"
            />
            {/* Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-x-0 bottom-0 z-50 max-h-[60vh] rounded-t-3xl border-t bg-card shadow-float lg:hidden"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-2">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>
              {/* Tabs */}
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => { setTab("chat"); sfx.click(); }}
                    className={cn("rounded-lg px-3 py-1 text-sm font-bold transition", tab === "chat" ? "bg-grad text-white" : "text-muted-foreground")}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => { setTab("players"); sfx.click(); }}
                    className={cn("rounded-lg px-3 py-1 text-sm font-bold transition", tab === "players" ? "bg-grad text-white" : "text-muted-foreground")}
                  >
                    <Users className="inline h-3.5 w-3.5" /> Players
                  </button>
                </div>
                <button
                  onClick={() => { setOpen(false); wasOpen.current = false; sfx.click(); }}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Content */}
              <div className="h-[40vh] overflow-hidden">
                {tab === "chat" ? <ChatPanel /> : <div className="h-full overflow-y-auto scroll-soft p-2"><Scoreboard /></div>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
