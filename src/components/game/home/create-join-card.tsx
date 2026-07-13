"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, LogIn, Plus, WifiOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AvatarPicker } from "./avatar-picker";
import { ColorPickerRow } from "./color-picker-row";
import { PLAYER_COLORS } from "@/lib/game/types";
import { useGameStore } from "@/lib/game/store";
import { getSocket } from "@/hooks/use-game-socket";
import { sfx } from "@/lib/game/sound";
import { cn } from "@/lib/utils";

export interface CreateJoinCardProps {
  mode: "create" | "join";
  onModeChange: (m: "create" | "join") => void;
  className?: string;
}

const ROOM_CODE_RE = /^[A-Z2-9]{5}$/;

export function CreateJoinCard({
  mode,
  onModeChange,
  className,
}: CreateJoinCardProps) {
  const connected = useGameStore((s) => s.connected);
  const connecting = useGameStore((s) => s.connecting);

  const [name, setName] = React.useState("");
  const [avatar, setAvatar] = React.useState("🐱");
  const [color, setColor] = React.useState(PLAYER_COLORS[0]);
  const [roomCode, setRoomCode] = React.useState("");
  const [roomName, setRoomName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [spectator, setSpectator] = React.useState(false);

  // hydrate identity from store on mount (if user previously picked)
  React.useEffect(() => {
    const s = useGameStore.getState();
    if (s.name) setName(s.name);
    if (s.avatar) setAvatar(s.avatar);
    if (s.color) setColor(s.color);
  }, []);

  // deep-link: if a join code was stashed (from ?join=CODE), prefill + switch to join mode
  React.useEffect(() => {
    try {
      const code = sessionStorage.getItem("dd-join-code");
      if (code) {
        setRoomCode(code);
        onModeChange("join");
        sessionStorage.removeItem("dd-join-code");
      }
    } catch {
      /* ignore */
    }
  }, [onModeChange]);

  const trimmedName = name.trim();
  const nameValid = trimmedName.length >= 1 && trimmedName.length <= 16;
  const roomValid = ROOM_CODE_RE.test(roomCode.trim().toUpperCase());
  const canCreate = connected && nameValid && !busy;
  const canJoin = connected && nameValid && roomValid && !busy;

  function handleCreate() {
    if (!nameValid) {
      toast.error("Please enter a name (1–16 characters).");
      return;
    }
    if (!connected) {
      toast.error("Still connecting to the server…");
      return;
    }
    sfx.click();
    setBusy(true);
    const customAvatar = useGameStore.getState().customAvatar;
    useGameStore.getState().setIdentity({
      name: trimmedName,
      avatar,
      color,
    });
    const socket = getSocket();
    socket.emit(
      "room:create",
      { name: trimmedName, avatar, color, customAvatar, roomName: roomName.trim() },
      (res) => {
        setBusy(false);
        if (res.ok && res.playerId) {
          useGameStore.getState().setMeId(res.playerId);
          useGameStore.getState().setView("lobby");
        } else {
          toast.error(res.error || "Could not create room.");
        }
      }
    );
  }

  function handleJoin() {
    if (!nameValid) {
      toast.error("Please enter a name (1–16 characters).");
      return;
    }
    if (!roomValid) {
      toast.error("Room code must be 5 letters/numbers.");
      return;
    }
    if (!connected) {
      toast.error("Still connecting to the server…");
      return;
    }
    sfx.click();
    setBusy(true);
    const customAvatar = useGameStore.getState().customAvatar;
    useGameStore.getState().setIdentity({
      name: trimmedName,
      avatar,
      color,
    });
    const socket = getSocket();
    socket.emit(
      "room:join",
      { roomCode: roomCode.trim().toUpperCase(), name: trimmedName, avatar, color, isSpectator: spectator, customAvatar },
      (res) => {
        setBusy(false);
        if (res.ok && res.playerId) {
          useGameStore.getState().setMeId(res.playerId);
          useGameStore.getState().setView("lobby");
        } else {
          toast.error(res.error || "Could not join room.");
        }
      }
    );
  }

  return (
    <motion.div
      id="create-join"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className={cn(
        "scroll-mt-24 rounded-3xl border border-border bg-card/95 p-5 shadow-float backdrop-blur sm:p-7",
        className
      )}
    >
      <Tabs value={mode} onValueChange={(v) => onModeChange(v as "create" | "join")}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <TabsList className="h-11 rounded-2xl p-1">
            <TabsTrigger
              value="create"
              className="h-9 rounded-xl px-5 text-sm font-semibold"
              onClick={() => sfx.click()}
            >
              <Plus className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger
              value="join"
              className="h-9 rounded-xl px-5 text-sm font-semibold"
              onClick={() => sfx.click()}
            >
              <LogIn className="h-4 w-4" />
              Join
            </TabsTrigger>
          </TabsList>

          <ConnectionPill connected={connected} connecting={connecting} />
        </div>

        <AnimatePresence mode="wait">
          {mode === "create" ? (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.25 }}
            >
              <TabsContent value="create" className="m-0 focus-visible:outline-none">
                <IdentityFields
                  name={name}
                  setName={setName}
                  nameValid={nameValid}
                  avatar={avatar}
                  setAvatar={setAvatar}
                  color={color}
                  setColor={setColor}
                />
                {/* Room name (optional) */}
                <div className="mb-4 mt-4">
                  <Label htmlFor="room-name" className="mb-1.5">
                    Room name <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="room-name"
                    maxLength={40}
                    placeholder="e.g. Friday Night Doodles"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="h-12 rounded-2xl text-base"
                  />
                </div>
                <motion.div whileTap={{ scale: 0.98 }} className="mt-1">
                  <Button
                    size="lg"
                    className="h-12 w-full rounded-2xl text-base shadow-soft"
                    disabled={!canCreate}
                    onClick={handleCreate}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {busy ? "Creating…" : "Create Room"}
                  </Button>
                </motion.div>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  You&apos;ll get a 5-character code to invite your friends.
                </p>
              </TabsContent>
            </motion.div>
          ) : (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.25 }}
            >
              <TabsContent value="join" className="m-0 focus-visible:outline-none">
                <div className="mb-4">
                  <Label htmlFor="room-code" className="mb-1.5">
                    Room code
                  </Label>
                  <Input
                    id="room-code"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={5}
                    placeholder="ABCDE"
                    value={roomCode}
                    onChange={(e) =>
                      setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""))
                    }
                    className="h-12 rounded-2xl text-center font-mono text-2xl font-bold tracking-[0.4em]"
                    aria-invalid={roomCode.length > 0 && !roomValid}
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Ask your friend for the 5-character code.
                  </p>
                </div>

                <IdentityFields
                  name={name}
                  setName={setName}
                  nameValid={nameValid}
                  avatar={avatar}
                  setAvatar={setAvatar}
                  color={color}
                  setColor={setColor}
                />

                {/* Spectator toggle */}
                <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-2xl border border-border bg-surface-2/50 p-3">
                  <input
                    type="checkbox"
                    checked={spectator}
                    onChange={(e) => { setSpectator(e.target.checked); sfx.click(); }}
                    className="size-4 accent-[var(--accent)]"
                  />
                  <span className="flex-1 text-sm font-medium">
                    👁 Join as spectator
                    <span className="block text-xs font-normal text-muted-foreground">Watch + react, but can&apos;t draw or guess. Can join mid-game.</span>
                  </span>
                </label>

                <motion.div whileTap={{ scale: 0.98 }} className="mt-5">
                  <Button
                    size="lg"
                    className="h-12 w-full rounded-2xl text-base shadow-soft"
                    disabled={!canJoin}
                    onClick={handleJoin}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogIn className="h-4 w-4" />
                    )}
                    {busy ? "Joining…" : spectator ? "Spectate Room" : "Join Room"}
                  </Button>
                </motion.div>
              </TabsContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Tabs>
    </motion.div>
  );
}

function ConnectionPill({
  connected,
  connecting,
}: {
  connected: boolean;
  connecting: boolean;
}) {
  const text = connected ? "Connected" : connecting ? "Connecting…" : "Offline";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        connected
          ? "bg-accent-soft text-accent-foreground"
          : "bg-muted text-muted-foreground"
      )}
      title={text}
    >
      {connected ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
      ) : connecting ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      <span className="hidden sm:inline">{text}</span>
    </span>
  );
}

function IdentityFields({
  name,
  setName,
  nameValid,
  avatar,
  setAvatar,
  color,
  setColor,
}: {
  name: string;
  setName: (v: string) => void;
  nameValid: boolean;
  avatar: string;
  setAvatar: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
}) {
  return (
    <>
      <div className="mb-4">
        <Label htmlFor="player-name" className="mb-1.5">
          Your name
        </Label>
        <Input
          id="player-name"
          maxLength={16}
          placeholder="e.g. PixelPanda"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 rounded-2xl text-base"
          aria-invalid={!nameValid && name.length > 0}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              // submit nearest button
              (e.currentTarget.form?.querySelector(
                'button[type="button"]:not([disabled])'
              ) as HTMLButtonElement | null)?.click();
            }
          }}
        />
      </div>

      <div className="mb-4">
        <Label className="mb-1.5">Avatar</Label>
        <AvatarPicker
          value={avatar}
          onChange={setAvatar}
          accentColor={color}
        />
      </div>

      <div>
        <Label className="mb-1.5">Accent color</Label>
        <ColorPickerRow
          value={color}
          onChange={setColor}
          colors={PLAYER_COLORS}
          label="Player accent color"
        />
      </div>

      {/* Live preview */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface-2/60 p-3">
        <span className="avatar-ring-static grid h-11 w-11 place-items-center rounded-full p-[2px]">
          <span className="grid h-full w-full place-items-center rounded-full bg-card text-xl">
            {avatar}
          </span>
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {name.trim() || "Your name"}
          </p>
          <p className="text-xs text-muted-foreground">This is how others see you</p>
        </div>
      </div>
    </>
  );
}

export default CreateJoinCard;
