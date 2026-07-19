"use client";

import * as React from "react";
import Link from "next/link";
import { Palette, Shirt, User } from "lucide-react";
import { Hero } from "./hero";
import { CreateJoinCard } from "./create-join-card";
import { HowToPlay } from "./how-to-play";
import { PaintStudioCard } from "./paint-studio-card";
import { ThemeSwitcher } from "./theme-switcher";
import { CosmeticsDialog } from "@/components/game/cosmetics-dialog";
import { ProfileDialog } from "@/components/game/profile-dialog";
import { AboutDialog } from "@/components/game/about-dialog";
import { LogoMark } from "@/components/game/logo";
import { sfx } from "@/lib/game/sound";

export interface HomeScreenProps {
  /** Wired by the parent page (e.g. to enter practice mode). */
  onPaint?: () => void;
}

export function HomeScreen({ onPaint }: HomeScreenProps) {
  const [mode, setMode] = React.useState<"create" | "join">("create");
  const [cosmeticsOpen, setCosmeticsOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [aboutOpen, setAboutOpen] = React.useState(false);

  function scrollToCard() {
    if (typeof document === "undefined") return;
    const el = document.getElementById("create-join");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function handleCreateFromHero() {
    setMode("create");
    // wait a tick so the tab/content is rendered before scrolling
    requestAnimationFrame(scrollToCard);
  }

  function handleJoinFromHero() {
    setMode("join");
    requestAnimationFrame(scrollToCard);
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky glass header */}
      <header className="sticky top-0 z-40 border-b border-border/60 glass">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:h-16">
          <a
            href="#top"
            className="group inline-flex items-center gap-2.5 rounded-full"
            onClick={() => sfx.click()}
            aria-label="Doodle Dash home"
          >
            <LogoMark size={36} />
            <span className="text-lg font-extrabold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
              Doodle <span className="text-grad">Dash</span>
            </span>
          </a>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card/70 px-2.5 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
              <Palette className="h-3.5 w-3.5" />
              Theme
            </span>
            <ThemeSwitcher compact />
            <button
              onClick={() => { sfx.click(); setCosmeticsOpen(true); }}
              className="grid size-11 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-accent-soft"
              aria-label="Customize"
              title="Customize"
            >
              <Shirt className="size-4" />
            </button>
            <button
              onClick={() => { sfx.click(); setProfileOpen(true); }}
              className="grid size-11 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-accent-soft"
              aria-label="Profile"
              title="Profile"
            >
              <User className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        <Hero onCreate={handleCreateFromHero} onJoin={handleJoinFromHero} />

        {/* Create / Join card */}
        <section className="px-4 py-6 sm:py-8">
          <div className="mx-auto max-w-2xl">
            <CreateJoinCard mode={mode} onModeChange={setMode} />
          </div>
        </section>

        {/* How to play */}
        <section className="px-4 py-6 sm:py-8">
          <div className="mx-auto max-w-3xl">
            <HowToPlay />
          </div>
        </section>

        {/* Paint Studio */}
        <section className="px-4 py-6 sm:py-8">
          <div className="mx-auto max-w-3xl">
            <PaintStudioCard onPaint={onPaint} />
          </div>
        </section>
      </main>

      {/* Sticky footer */}
      <footer className="mt-auto border-t border-border/60 bg-card/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <p className="text-center sm:text-left">
            Made with <span aria-hidden>❤️</span> by{" "}
            <span className="font-bold text-foreground">~Kushal</span> · Doodle Dash
          </p>
          <nav className="flex items-center gap-4" aria-label="Footer">
            <button
              type="button"
              className="rounded-full px-2 py-1 transition hover:text-foreground"
              onClick={() => {
                sfx.click();
                scrollToCard();
              }}
            >
              How to play
            </button>
            <button
              type="button"
              className="rounded-full px-2 py-1 transition hover:text-foreground"
              onClick={() => { sfx.click(); setAboutOpen(true); }}
            >
              About
            </button>
            <Link
              href="/privacy"
              className="rounded-full px-2 py-1 transition hover:text-foreground"
              onClick={() => sfx.click()}
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="rounded-full px-2 py-1 transition hover:text-foreground"
              onClick={() => sfx.click()}
            >
              Terms
            </Link>
            <a
              href="https://kushalneedsmcp.online"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-2 py-1 transition hover:text-foreground"
              onClick={() => sfx.click()}
            >
              kushalneedsmcp.online
            </a>
          </nav>
        </div>
      </footer>

      <CosmeticsDialog open={cosmeticsOpen} onOpenChange={setCosmeticsOpen} />
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </div>
  );
}

export default HomeScreen;
