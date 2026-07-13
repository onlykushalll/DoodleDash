"use client";

import { useState } from "react";
import { Copy, Share2, Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sfx } from "@/lib/game/sound";
import { useGameStore } from "@/lib/game/store";

export function ShareCard() {
  const room = useGameStore((s) => s.room);
  const [copied, setCopied] = useState(false);

  if (!room) return null;
  const code = room.code;

  const buildLink = () => `${window.location.origin}?join=${code}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildLink());
      sfx.pop();
      toast.success("Link copied!", {
        description: "Send it to a friend to invite them to the room.",
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback for browsers without clipboard API
      toast.error("Couldn't copy automatically", {
        description: `Copy this code: ${code}`,
      });
    }
  };

  const share = async () => {
    sfx.click();
    const link = buildLink();
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Join my Doodle Dash room!",
          text: `Come draw & guess with me! Room code: ${code}`,
          url: link,
        });
      } catch {
        /* user cancelled — no-op */
      }
    } else {
      await copyLink();
    }
  };

  return (
    <Card className="overflow-hidden rounded-2xl shadow-soft">
      <CardContent className="flex flex-col items-center gap-4 p-6">
        <div className="text-center">
          <p className="flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Link2 className="h-3 w-3" />
            Room Code
          </p>
          <p className="text-grad mt-1 font-mono text-4xl font-extrabold tracking-[0.4em]">
            {code}
          </p>
        </div>
        <div className="flex w-full gap-2">
          <Button onClick={copyLink} variant="default" className="flex-1">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button
            onClick={share}
            variant="outline"
            size="icon"
            aria-label="Share room link"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Friends can join by opening the link or entering the code.
        </p>
      </CardContent>
    </Card>
  );
}

export default ShareCard;
