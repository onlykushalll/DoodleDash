"use client";

import { useEffect, useState } from "react";
import { useGameSocket } from "@/hooks/use-game-socket";
import { useGameStore } from "@/lib/game/store";
import { HomeScreen } from "@/components/game/home/home-screen";
import { LobbyScreen } from "@/components/game/lobby/lobby-screen";
import { PlayScreen } from "@/components/game/play/play-screen";
import { PaintStudio } from "@/components/game/paint/paint-studio";
import { QueenArrivalOverlay } from "@/components/game/queen-arrival-overlay";
import { LoadingScreen } from "@/components/game/loading-screen";

export default function Page() {
  useGameSocket();

  const view = useGameStore((s) => s.view);
  const room = useGameStore((s) => s.room);
  const [paintMode, setPaintMode] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Show loading screen on first visit
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = sessionStorage.getItem("dd-loaded");
    if (seen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoaded(true);
    } else {
      const t = setTimeout(() => {
        setLoaded(true);
        sessionStorage.setItem("dd-loaded", "1");
      }, 2600);
      return () => clearTimeout(t);
    }

    // Read ?join=CODE
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    if (code) {
      try {
        sessionStorage.setItem("dd-join-code", code.toUpperCase().slice(0, 5));
      } catch {
        /* ignore */
      }
    }
  }, []);

  if (!loaded) return <LoadingScreen />;

  let screen: React.ReactNode;
  if (paintMode) {
    screen = <PaintStudio onExit={() => setPaintMode(false)} />;
  } else if (view === "play" || (room && room.stage !== "lobby")) {
    screen = <PlayScreen />;
  } else if (view === "lobby" && room) {
    screen = <LobbyScreen />;
  } else {
    screen = <HomeScreen onPaint={() => setPaintMode(true)} />;
  }

  return (
    <>
      {screen}
      <QueenArrivalOverlay />
    </>
  );
}
