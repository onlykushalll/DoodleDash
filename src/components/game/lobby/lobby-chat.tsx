"use client";

import { useEffect, useRef, useState } from "react";
import { Send, MessageCircle } from "lucide-react";
import { useGameStore } from "@/lib/game/store";
import { getSocket } from "@/hooks/use-game-socket";
import { sfx } from "@/lib/game/sound";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/game/types";

export function LobbyChat() {
  const room = useGameStore((s) => s.room);
  const meId = useGameStore((s) => s.meId);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const messageCount = room?.chat.length ?? 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messageCount]);

  if (!room) return null;
  const messages = room.chat;

  const send = () => {
    const content = text.trim();
    if (!content) return;
    sfx.click();
    getSocket().emit("chat:send", { content });
    setText("");
  };

  return (
    <Card className="flex flex-col rounded-2xl shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4 text-primary" />
          Lobby Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div
          ref={scrollRef}
          className="scroll-soft flex max-h-72 flex-col gap-2 overflow-y-auto rounded-xl bg-[var(--surface-2)] p-3"
        >
          {messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Say hi to your friends! 👋
            </p>
          ) : (
            messages.map((m) => <ChatRow key={m.id} message={m} mine={m.playerId === meId} />)
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            maxLength={200}
            className="flex-1"
            aria-label="Chat message"
          />
          <Button type="submit" size="icon" disabled={!text.trim()} aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface ChatRowProps {
  message: ChatMessage;
  mine: boolean;
}

function ChatRow({ message, mine }: ChatRowProps) {
  if (message.type === "system") {
    return (
      <p className="py-1 text-center text-xs italic text-muted-foreground">
        {message.content}
      </p>
    );
  }
  if (message.type === "close") {
    return (
      <p className="py-0.5 text-center text-xs italic text-muted-foreground/80">
        {message.name}: {message.content} <span className="text-primary">(close!)</span>
      </p>
    );
  }
  if (message.type === "correct") {
    return (
      <p className="py-0.5 text-center text-xs font-semibold text-emerald-600">
        {message.name} guessed the word! 🎉
      </p>
    );
  }
  return (
    <div className={cn("flex flex-col gap-0.5", mine ? "items-end" : "items-start")}>
      <span className="text-[10px] font-semibold text-muted-foreground">
        {mine ? "You" : message.name}
      </span>
      <p
        className={cn(
          "max-w-[80%] break-words rounded-2xl px-3 py-1.5 text-sm",
          mine
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm border bg-card shadow-soft"
        )}
      >
        {message.content}
      </p>
    </div>
  );
}

export default LobbyChat;
