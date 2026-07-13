"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useGameStore } from "@/lib/game/store";
import { getSocket } from "@/hooks/use-game-socket";
import { sfx } from "@/lib/game/sound";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export function LeaveButton() {
  const [open, setOpen] = useState(false);
  const setView = useGameStore((s) => s.setView);
  const reset = useGameStore((s) => s.reset);

  const leave = () => {
    sfx.close();
    try {
      getSocket().emit("room:leave");
    } catch {
      /* socket may be disconnected — ignore */
    }
    reset();
    setView("home");
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          aria-label="Leave room"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Leave</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Leave the room?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll be returned to the home screen. If you&apos;re the host, another player
            will become the host.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay</AlertDialogCancel>
          <AlertDialogAction
            onClick={leave}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Leave Room
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default LeaveButton;
