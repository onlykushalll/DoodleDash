"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, MessagesSquare, Send, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGameStore, selectMe, selectIsDrawer } from "@/lib/game/store";
import { getSocket } from "@/hooks/use-game-socket";
import { sfx } from "@/lib/game/sound";
import type { ChatMessage, GameStage } from "@/lib/game/types";

const GUESS_DISABLE_STAGES: GameStage[] = []; // Never disable chat — server allows it in all stages

function ChatBubble({
  message,
  isMe,
}: {
  message: ChatMessage;
  isMe: boolean;
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

  // close: subtle amber bubble — shows the actual guess
  if (type === "close") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("my-1 flex flex-col", isMe ? "items-end" : "items-start")}
      >
        <div className="max-w-[85%] rounded-2xl border border-amber-200/70 bg-amber-50 px-3 py-1.5 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 break-words">
          {!isMe && (
            <div className="mb-0.5 text-[11px] font-bold text-amber-600/80">
              {name}
            </div>
          )}
          <div className="leading-snug">{content}</div>
          <div className="mt-0.5 text-[10px] font-semibold text-amber-500">
            🔥 close!
          </div>
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
      className={cn("my-1 flex w-full flex-col", mine ? "items-end" : "items-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-1.5 text-sm shadow-soft break-words",
          mine
            ? "rounded-br-md bg-grad text-primary-foreground"
            : "rounded-bl-md bg-card text-card-foreground border border-border/60"
        )}
      >
        {!mine && (
          <div className="mb-0.5 text-[11px] font-bold text-primary/80">
            {name}
          </div>
        )}
        <div className="leading-snug">{content}</div>
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
  const [atBottom, setAtBottom] = React.useState(true);

  const chat = room?.chat ?? [];
  const stage = room?.stage ?? "lobby";
  const guessedThisRound = !!me?.guessedThisRound;

  // Auto-scroll to bottom on new messages — but only if the user is already
  // at the bottom (don't yank them away while reading older messages).
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el && atBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [chat.length, stage, atBottom]);

  // Track scroll position to know whether to show the "jump to bottom" button.
  const handleScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(distFromBottom < 40);
  }, []);

  const jumpToBottom = React.useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      setAtBottom(true);
    }
  }, []);

  const disableInput = GUESS_DISABLE_STAGES.includes(stage);
  const isGuessInput = !isDrawer && !guessedThisRound;

  const placeholder = React.useMemo(() => {
    if (isDrawer && stage === "choosing") return "Pick a word above…";
    if (isDrawer) return "You're drawing — chat to talk, no guessing!";
    if (guessedThisRound) return "You guessed! Keep chatting…";
    return "Type your guess…";
  }, [stage, isDrawer, guessedThisRound]);

  const hint = React.useMemo(() => {
    if (isDrawer && stage === "choosing") return null;
    if (isDrawer)
      return "🎨 You're drawing — your messages are sent as chat, not guesses.";
    if (guessedThisRound) return "✅ You guessed correctly — chat freely!";
    return null;
  }, [stage, isDrawer, guessedThisRound]);

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
    <Card className="flex h-full min-h-0 flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-soft">
      <header className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-2.5">
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
        onScroll={handleScroll}
        className="scroll-soft min-h-0 flex-1 overflow-y-auto px-3 py-2"
      >
        <AnimatePresence initial={false}>
          {chat.length === 0 && (
            <div className="px-2 py-8 text-center text-sm text-muted-foreground">
              <Sparkles className="mx-auto mb-2 h-5 w-5 text-primary/60" />
              No messages yet. Say hi 👋
            </div>
          )}
          {chat.map((m) => (
            <ChatBubble key={m.id} message={m} isMe={m.playerId === me?.id} />
          ))}
        </AnimatePresence>
      </div>

      {/* Jump-to-bottom button (appears when scrolled up) */}
      <AnimatePresence>
        {!atBottom && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="relative"
          >
            <button
              type="button"
              onClick={jumpToBottom}
              className="absolute -top-10 right-3 z-10 grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-foreground shadow-float transition hover:scale-110"
              aria-label="Jump to latest messages"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="shrink-0 border-t border-border/60 p-2.5 sm:p-3">
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
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="send"
            aria-label={isGuessInput ? "Guess input" : "Chat input"}
            className="h-11 rounded-xl text-base sm:h-10 sm:text-sm"
          />
          <Button
            type="submit"
            size="icon"
            disabled={disableInput || input.trim().length === 0}
            aria-label="Send"
            className="h-11 w-11 shrink-0 rounded-xl sm:h-10 sm:w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}

export default ChatPanel;
