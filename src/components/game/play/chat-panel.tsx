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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const GUESS_DISABLE_STAGES: GameStage[] = ["choosing"];

const EMOJI_CATEGORIES = {
  Smileys: ["😀","😂","🥰","😎","🤔","😭","😡","😴","🤪","😇","🥳","🤓","😬","🙄","😏","😱"],
  Gestures: ["👍","👎","👏","🙌","🙏","💪","🤙","✌️","🤞","🤟","👌","👆","👇","🫶"],
  Hearts: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❣️","💕","💖","💘","💝"],
  Fun: ["🔥","✨","🎉","🎊","🎨","🖌️","✏️","🌈","⭐","💀","🫠","🤡","👻","🤖"],
};

function highlightMentions(text: string, myName?: string) {
  if (!myName) return text;
  const parts = text.split(new RegExp(`(${myName})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === myName.toLowerCase() ? (
      <span key={i} className="rounded bg-white/30 px-0.5 font-bold text-foreground">{part}</span>
    ) : (
      part
    )
  );
}

function ChatBubble({
  message,
  isMe,
  playerColor,
  reactions,
  onReact,
  myName,
}: {
  message: ChatMessage;
  isMe: boolean;
  playerColor?: string;
  reactions?: { emoji: string; name: string }[];
  onReact?: (emoji: string) => void;
  myName?: string;
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
      className={cn("my-1 relative flex flex-col", mine ? "items-end" : "items-start")}
    >
      <div
        className={cn(
          "group inline-block max-w-[75%] w-fit rounded-2xl px-3 py-1.5 text-sm shadow-soft break-words",
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
        <div className="whitespace-pre-wrap break-words leading-snug">
          {highlightMentions(content, myName)}
        </div>
        {/* Reactions - inline, no layout shift */}
        {reactions && reactions.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-0.5">
            {Object.entries(
              reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([emoji, count]) => (
              <span key={emoji} className={cn("inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium", mine ? "bg-white/25" : "bg-muted")} title={reactions.filter(r => r.emoji === emoji).map(r => r.name).join(", ")}>
                {emoji}{count > 1 ? ` ${count}` : ""}
              </span>
            ))}
          </div>
        )}
        {/* Quick react buttons - absolute positioned to avoid layout shift */}
        <div className="absolute -top-3 right-1 flex gap-0.5 rounded-full bg-card p-0.5 shadow-soft opacity-0 transition group-hover:opacity-100 z-10">
          {["👍", "😂", "🔥"].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onReact?.(emoji)}
              className={cn("rounded-full px-1.5 py-0.5 text-xs hover:bg-accent-soft", mine ? "text-foreground" : "text-foreground")}
            >
              {emoji}
            </button>
          ))}
        </div>
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

  const [typingUsers, setTypingUsers] = React.useState<string[]>([]);
  const typingTimeoutRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const [reactions, setReactions] = React.useState<Record<string, { emoji: string; name: string }[]>>({});
  const [chatSounds, setChatSounds] = React.useState(false);
  const [emojiCat, setEmojiCat] = React.useState<keyof typeof EMOJI_CATEGORIES>("Smileys");

  const chat = room?.chat ?? [];
  const stage = room?.stage ?? "lobby";
  const guessedThisRound = !!me?.guessedThisRound;

  // Listen for socket events
  React.useEffect(() => {
    const socket = getSocket();

    const onTyping = ({ playerId, name }: { playerId: string; name: string }) => {
      if (playerId === me?.id) return;
      setTypingUsers((prev) => prev.includes(name) ? prev : [...prev, name]);
      const existing = typingTimeoutRef.current.get(playerId);
      if (existing) clearTimeout(existing);
      typingTimeoutRef.current.set(playerId, setTimeout(() => {
        setTypingUsers((prev) => prev.filter((n) => n !== name));
      }, 3000));
    };

    const onReaction = ({ messageId, emoji, name }: any) => {
      setReactions((prev) => {
        const existing = prev[messageId] || [];
        const filtered = existing.filter((r) => !(r.emoji === emoji && r.name === name));
        if (filtered.length === existing.length) {
          return { ...prev, [messageId]: [...existing, { emoji, name }] };
        }
        return { ...prev, [messageId]: filtered };
      });
    };

    socket.on("chat:typing", onTyping);
    socket.on("chat:reaction", onReaction);

    return () => {
      socket.off("chat:typing", onTyping);
      socket.off("chat:reaction", onReaction);
    };
  }, [me?.id]);

  // Emit typing on input change (throttled)
  const lastTypingRef = React.useRef(0);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    const now = Date.now();
    if (now - lastTypingRef.current > 2000) {
      lastTypingRef.current = now;
      getSocket().emit("chat:typing");
    }
  };

  // Play sound on new message (only if enabled and not my own message)
  const prevChatLen = React.useRef(0);
  React.useEffect(() => {
    if (chatSounds && chat.length > prevChatLen.current) {
      const lastMsg = chat[chat.length - 1];
      if (lastMsg && lastMsg.playerId !== me?.id) {
        sfx.chatPop();
      }
    }
    prevChatLen.current = chat.length;
  }, [chat, chatSounds, me?.id]);

  const insertEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
    inputRef.current?.focus();
  };

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
    <Card className="shadow-soft flex h-full flex-col gap-0 overflow-hidden rounded-none border-0">
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-primary" />
          <h2 className="font-extrabold tracking-tight">Chat &amp; Guesses</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="tabular-nums">
            {messageCount}
          </Badge>
          <button
            type="button"
            onClick={() => setChatSounds((v) => !v)}
            className="rounded-lg p-1 transition hover:bg-accent-soft text-sm"
            aria-label="Toggle chat sounds"
            title={chatSounds ? "Chat sounds on" : "Chat sounds off"}
          >
            {chatSounds ? "🔔" : "🔕"}
          </button>
        </div>
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
                reactions={reactions[m.id]}
                onReact={(emoji) => getSocket().emit("chat:react", { messageId: m.id, emoji })}
                myName={me?.name}
              />
            );
          })}
        </AnimatePresence>
      </div>

      <div className="border-t border-border/60 p-3">
        {typingUsers.length > 0 && (
          <div className="px-3 pb-1 text-[11px] italic text-muted-foreground animate-pulse">
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing…`
              : `${typingUsers.slice(0, 2).join(" and ")} are typing…`}
          </div>
        )}
        {hint && (
          <div className="mb-2 rounded-lg bg-accent-soft/70 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
            {hint}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disableInput}
            maxLength={120}
            autoComplete="off"
            aria-label={isGuessInput ? "Guess input" : "Chat input"}
            className="rounded-xl"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={disableInput}
                className="rounded-xl shrink-0"
                aria-label="Choose emoji"
              >
                😀
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3 shadow-lg rounded-2xl border border-border">
              <div className="space-y-2">
                <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border/50">
                  {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEmojiCat(cat as keyof typeof EMOJI_CATEGORIES)}
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-bold transition shrink-0",
                        emojiCat === cat ? "bg-grad text-white" : "text-muted-foreground hover:bg-accent-soft"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 max-h-36 overflow-y-auto pr-1">
                  {EMOJI_CATEGORIES[emojiCat].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { insertEmoji(emoji); sfx.pop(); }}
                      className="grid h-7 w-7 place-items-center rounded-md transition hover:bg-accent-soft text-base"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
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
