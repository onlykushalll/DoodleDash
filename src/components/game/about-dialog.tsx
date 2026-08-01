"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export function AboutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">About Doodle Dash</DialogTitle>
        </DialogHeader>
        <ScrollArea className="scroll-soft max-h-[70vh] pr-2">
          <div className="space-y-6 px-1 pb-4">
            {/* What is it */}
            <section>
              <h3 className="mb-2 text-lg font-bold">🎨 What is Doodle Dash?</h3>
              <p className="text-sm text-muted-foreground">
                Doodle Dash is a free, real-time multiplayer drawing & guessing game — like
                Pictionary meets skribbl.io, but beautiful. Create a room, invite your friends,
                take turns drawing words while others guess. The faster you guess, the more points
                you earn!
              </p>
            </section>

            {/* Features */}
            <section>
              <h3 className="mb-2 text-lg font-bold">✨ Features</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  "Real-time multiplayer",
                  "5 brush types (pen, marker, pencil, neon, eraser)",
                  "Fill bucket + shapes",
                  "22-color palette + custom picker",
                  "4 light themes (Peach, Mint, Sky, Lavender)",
                  "Symmetry/mirror brush",
                  "Color-blind accessible palette",
                  "High-contrast mode",
                  "ASMR brush sounds",
                  "3 paper textures",
                  "Custom hand-drawn avatars",
                  "Free cosmetics (frames, colors, borders)",
                  "Player profile + portfolio",
                  "Spectator mode",
                  "Paint Studio (solo free-paint mode)",
                  "Floating emoji reactions",
                  "Replay gallery",
                  "834 curated drawable words",
                  "Non-repeating words per game",
                  "PWA / installable",
                  "Mobile + desktop responsive",
                  "Pause on insufficient players",
                  "Spectator promotion",
                  "Reconnect grace period",
                  "Synthesized sound effects",
                  "Confetti celebrations",
                ].map((f) => (
                  <Badge key={f} variant="secondary" className="justify-start text-xs">
                    {f}
                  </Badge>
                ))}
              </div>
            </section>

            {/* How to play */}
            <section>
              <h3 className="mb-2 text-lg font-bold">🎮 How to Play</h3>
              <ol className="ml-4 list-decimal space-y-1.5 text-sm text-muted-foreground">
                <li><b>Create a room</b> (or join with a 5-character code).</li>
                <li>Share the room code with your friends.</li>
                <li>The host clicks <b>Start Game</b>.</li>
                <li>Each round, one player is the <b>drawer</b> — they pick from 4 words.</li>
                <li>The drawer draws while everyone else <b>guesses</b> in the chat.</li>
                <li>Correct guesses earn points based on speed. The drawer also earns points.</li>
                <li>After all rounds, the player with the most points wins! 🏆</li>
              </ol>
            </section>

            {/* Tech stack */}
            <section>
              <h3 className="mb-2 text-lg font-bold">🔧 Tech Stack</h3>
              <div className="flex flex-wrap gap-2">
                {["Next.js 16", "TypeScript", "Tailwind CSS 4", "shadcn/ui", "Socket.io", "Prisma", "Framer Motion", "Zustand", "Web Audio API"].map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            </section>

            {/* Privacy */}
            <section className="space-y-3">
              <h3 className="text-lg font-bold">🔒 Privacy</h3>
              <p className="text-sm text-muted-foreground">
                Doodle Dash collects <b>no personal data</b>. No accounts, no login, no tracking.
                Your name, avatar, and drawings exist only during the game session. Profile stats
                and cosmetics are stored locally in your browser (localStorage). Game state is
                in-memory on the server and is not persisted.
              </p>
              <div className="rounded-xl border border-border p-3">
                <p className="mb-2 text-xs font-semibold">Your Data</p>
                <p className="mb-2 text-xs text-muted-foreground">
                  All your data (theme, preferences, profile) is stored locally in your browser.
                  No data is sent to any server.
                </p>
                <button
                  onClick={() => {
                    ["dd-theme", "dd-canvas-prefs", "dd-cosmetics", "dd-buddies", "dd-my-buddy-code", "dd-portfolio", "dd-profile", "dd-word-history", "dd-consent", "dd-loaded"].forEach((key) => {
                      try { localStorage.removeItem(key); } catch {}
                    });
                    window.location.reload();
                  }}
                  className="rounded-lg border border-destructive px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive hover:text-white cursor-pointer"
                >
                  Delete all my local data
                </button>
              </div>
            </section>

            {/* FAQ */}
            <section>
              <h3 className="mb-2 text-lg font-bold">❓ FAQ</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <p className="font-semibold text-foreground">How many players can play?</p>
                  <p>2–12 players per room. You need at least 2 to start a game.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Does it work on mobile?</p>
                  <p>Yes! It's a PWA — installable, touch-friendly, and responsive on any device.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">What happens if I refresh the page?</p>
                  <p>You have 20 seconds to rejoin with the same name — your seat is preserved.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">What if someone leaves mid-game?</p>
                  <p>The game pauses and waits. A spectator can jump in, or the player can rejoin.</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Can I play alone?</p>
                  <p>Yes — open the <b>Paint Studio</b> for a free-form canvas with all brushes and tools!</p>
                </div>
              </div>
            </section>

            {/* Credit */}
            <section className="border-t pt-4 text-center">
              <p className="text-sm font-semibold">
                Made with ❤️ by <span className="text-grad">~Kushal</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Doodle Dash · A multiplayer drawing & guessing game
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <a href="https://kushalneedsmcp.online" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                  kushalneedsmcp.online
                </a>
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default AboutDialog;
