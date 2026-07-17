"use client";

import { useState } from "react";
import { LogOut, XCircle } from "lucide-react";
import { useGameStore, selectIsHost } from "@/lib/game/store";
import { getSocket } from "@/hooks/use-game-socket";
import { sfx } from "@/lib/game/sound";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export function LeaveButton() {
  const [open, setOpen] = useState(false);
  const isHost = useGameStore(selectIsHost);
  const setView = useGameStore((s) => s.setView);
  const reset = useGameStore((s) => s.reset);

  const leave = () => {
    sfx.close();
    try { getSocket().emit("room:leave"); } catch {}
    reset();
    setView("home");
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" aria-label="Leave room">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Leave</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{isHost ? "Leave or Close Room?" : "Leave the room?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {isHost
              ? "As the host, you can either leave (another player becomes host) or close the room for everyone."
              : "You'll be returned to the home screen."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:gap-2">
          <AlertDialogAction onClick={leave} className="bg-destructive text-white hover:bg-destructive/90">
            <LogOut className="mr-1 h-4 w-4" /> Leave Room
          </AlertDialogAction>
          {isHost && (
            <AlertDialogAction
              onClick={() => {
                sfx.close();
                try { getSocket().emit("room:leave"); } catch {}
                reset();
                setView("home");
              }}
              className="bg-red-700 text-white hover:bg-red-800"
            >
              <XCircle className="mr-1 h-4 w-4" /> Close Room for Everyone
            </AlertDialogAction>
          )}
          <AlertDialogCancel>Stay</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default LeaveButton;
