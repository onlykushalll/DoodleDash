"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessagesSquare, Send, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGameStore, selectMe, selectIsDrawer } from "@/lib/game/store";
import { getSocket } from "@/hooks/use-game-socket";
import { sfx } from "@/lib/game/sound";
import type { ChatMessage, GameStage } from "@/lib/game/types";

const GUESS_DISABLE_STAGES: GameStage[] = ["choosing"];

function ChatBubble({
  message,
  isMe,
  playerColor,
}: {
  message: ChatMessage;
  isMe: boolean;
  playerColor?: string;
}) {
  const { type, name, content, timestamp } = message;

  // system messages: italic muted centered text
  if (type === "system") {
    return (
      <div className="my-1.5 flex justify-center">
        <span className="rounded-full bg-muted/70 px-3 py-1 text-center text-[11px] italic text-muted-foreground">
          {content}
        </span>
      </div>
    );
  }

  // correct: green accent, never reveals word
  if (type === "correct") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-1"
      >
        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          ✅ <span className="font-extrabold">{name}</span> guessed the word!
        </div>
      </motion.div>
    );
  }

  // close: subtle amber bubble
  if (type === "close") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="my-1"
      >
        <div className="rounded-2xl border border-amber-200/70 bg-amber-50 px-3 py-1.5 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          <span className="font-semibold">{name}</span> is close…
        </div>
      </motion.div>
    );
  }

  // chat / guess — normal bubble, mine on the right
  const mine = isMe;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("my-1 flex flex-col", mine ? "items-end" : "items-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-1.5 text-sm shadow-soft",
          mine
            ? "rounded-br-md text-white"
            : "rounded-bl-md bg-card text-card-foreground border border-border/60"
        )}
        style={mine && playerColor ? { backgroundColor: playerColor } : undefined}
      >
        {!mine && (
          <div className="mb-0.5 text-[11px] font-bold text-primary/80">
            {name}
          </div>
        )}
        <div className="break-words leading-snug">{content}</div>
      </div>
      <span className="mt-0.5 px-1 text-[9px] text-muted-foreground/70 tabular-nums">
        {new Date(timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </motion.div>
  );
}

export function ChatPanel() {
  const room = useGameStore((s) => s.room);
  const me = useGameStore(selectMe);
  const isDrawer = useGameStore(selectIsDrawer);

  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const chat = room?.chat ?? [];
  const stage = room?.stage ?? "lobby";
  const guessedThisRound = !!me?.guessedThisRound;

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length, stage]);

  const disableInput = GUESS_DISABLE_STAGES.includes(stage);
  const isGuessInput = !isDrawer && !guessedThisRound;

  const placeholder = React.useMemo(() => {
    if (disableInput) return "Waiting for the round to start…";
    if (isDrawer) return "You're drawing — chat to talk, no guessing!";
    if (guessedThisRound) return "You guessed! Keep chatting…";
    return "Type your guess…";
  }, [disableInput, isDrawer, guessedThisRound]);

  const hint = React.useMemo(() => {
    if (disableInput) return null;
    if (isDrawer)
      return "🎨 You're drawing — your messages are sent as chat, not guesses.";
    if (guessedThisRound) return "✅ You guessed correctly — chat freely!";
    return null;
  }, [disableInput, isDrawer, guessedThisRound]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !room) return;
    if (disableInput) return;
    // Drawer / guessed players send plain chat; others send guesses (server decides).
    getSocket().emit("chat:send", { content });
    setInput("");
    sfx.click();
    inputRef.current?.focus();
  }

  const messageCount = chat.length;

  return (
    <Card className="shadow-soft flex h-full flex-col gap-0 overflow-hidden rounded-2xl p-0">
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-primary" />
          <h2 className="font-extrabold tracking-tight">Chat &amp; Guesses</h2>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {messageCount}
        </Badge>
      </header>

      <div
        ref={scrollRef}
        className="scroll-soft flex-1 overflow-y-auto px-3 py-2"
      >
        <AnimatePresence initial={false}>
          {chat.length === 0 && (
            <div className="px-2 py-8 text-center text-sm text-muted-foreground">
              <Sparkles className="mx-auto mb-2 h-5 w-5 text-primary/60" />
              No messages yet. Say hi 👋
            </div>
          )}
          {chat.map((m) => {
            const player = room?.players.find((p) => p.id === m.playerId);
            return (
              <ChatBubble
                key={m.id}
                message={m}
                isMe={m.playerId === me?.id}
                playerColor={player?.color}
              />
            );
          })}
        </AnimatePresence>
      </div>

      <div className="border-t border-border/60 p-3">
        {hint && (
          <div className="mb-2 rounded-lg bg-accent-soft/70 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
            {hint}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={disableInput}
            maxLength={120}
            autoComplete="off"
            aria-label={isGuessInput ? "Guess input" : "Chat input"}
            className="rounded-xl"
          />
          <Button
            type="submit"
            size="icon"
            disabled={disableInput || input.trim().length === 0}
            aria-label="Send"
            className="rounded-xl"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}

export default ChatPanel;
