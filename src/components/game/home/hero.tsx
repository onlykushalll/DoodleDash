"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sfx } from "@/lib/game/sound";

export interface HeroProps {
  onCreate: () => void;
  onJoin: () => void;
}

/** Decorative floating doodle (emoji with a gentle bob animation). */
function FloatingDoodle({
  emoji,
  className,
  delay = 0,
  duration = 3.6,
  rotate = 0,
}: {
  emoji: string;
  className?: string;
  delay?: number;
  duration?: number;
  rotate?: number;
}) {
  return (
    <motion.span
      aria-hidden
      className={`pointer-events-none absolute select-none text-3xl sm:text-4xl ${className ?? ""}`}
      style={{ rotate: `${rotate}deg` }}
      animate={{ y: [0, -10, 0], rotate: [rotate, rotate + 4, rotate] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {emoji}
    </motion.span>
  );
}

export function Hero({ onCreate, onJoin }: HeroProps) {
  return (
    <section className="relative overflow-hidden px-4 pt-10 pb-6 sm:pt-16 sm:pb-10">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
        {/* Left: copy + CTAs */}
        <div className="relative z-10 text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-soft backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Multiplayer drawing &amp; guessing
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="font-extrabold tracking-tight text-5xl leading-[1.05] sm:text-6xl lg:text-7xl"
          >
            <span className="text-grad">Draw.</span>{" "}
            <span className="text-grad">Guess.</span>{" "}
            <span className="text-grad">Laugh.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg md:mx-0"
          >
            Pick your avatar, grab a brush, and doodle your way to victory.
            Sketch with friends in real time — or unwind solo in
            the Paint Studio when you&apos;re feeling creative.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-7 flex flex-col items-center gap-3 sm:flex-row md:items-start md:justify-start"
          >
            <motion.div whileTap={{ scale: 0.96 }} className="w-full sm:w-auto">
              <Button
                size="lg"
                className="h-12 w-full rounded-2xl px-7 text-base shadow-soft sm:w-auto"
                onClick={() => {
                  sfx.click();
                  onCreate();
                }}
              >
                <Sparkles className="h-4 w-4" />
                Create a Room
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.96 }} className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full rounded-2xl border-2 px-7 text-base shadow-soft sm:w-auto"
                onClick={() => {
                  sfx.click();
                  onJoin();
                }}
              >
                <Users className="h-4 w-4" />
                Join a Room
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground md:justify-start"
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent" />
              No signup needed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Up to 12 players
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Works on any device
            </span>
          </motion.div>
        </div>

        {/* Right: playful doodle illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="relative mx-auto hidden aspect-square w-full max-w-md place-items-center md:grid"
        >
          {/* Soft gradient blob */}
          <div
            aria-hidden
            className="absolute inset-6 rounded-full opacity-70 blur-2xl"
            style={{
              background:
                "radial-gradient(closest-side, var(--accent-soft), transparent)",
            }}
          />

          {/* Doodle card stack — pure CSS / inline SVG */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-2 top-8 h-44 w-44 rotate-[-8deg] rounded-3xl border border-border bg-card p-3 shadow-float"
          >
            <div className="grid h-full w-full place-items-center rounded-2xl bg-surface-2">
              <svg viewBox="0 0 120 120" className="h-32 w-32">
                {/* smiley doodle */}
                <circle
                  cx="60"
                  cy="60"
                  r="44"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <circle cx="46" cy="52" r="4" fill="var(--accent)" />
                <circle cx="74" cy="52" r="4" fill="var(--accent)" />
                <path
                  d="M44 72 Q 60 86, 76 72"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
            className="absolute bottom-10 right-2 h-44 w-44 rotate-[7deg] rounded-3xl border border-border bg-card p-3 shadow-float"
          >
            <div className="grid h-full w-full place-items-center rounded-2xl bg-surface-2">
              <svg viewBox="0 0 120 120" className="h-32 w-32">
                {/* heart doodle */}
                <path
                  d="M60 92 C 22 64, 28 30, 50 30 C 60 30, 60 42, 60 42 C 60 42, 60 30, 70 30 C 92 30, 98 64, 60 92 Z"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </motion.div>

          {/* Center palette badge */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="grid h-24 w-24 place-items-center rounded-full bg-grad text-4xl shadow-float ring-4 ring-card">
              🎨
            </div>
          </motion.div>

          {/* Floating emoji */}
          <FloatingDoodle emoji="✏️" className="left-0 top-0" duration={3.2} />
          <FloatingDoodle
            emoji="🖌️"
            className="right-4 top-0"
            delay={0.5}
            duration={3.8}
            rotate={12}
          />
          <FloatingDoodle
            emoji="🌈"
            className="bottom-2 left-6"
            delay={0.8}
            duration={4.2}
          />
          <FloatingDoodle
            emoji="⭐"
            className="bottom-16 right-0"
            delay={0.2}
            duration={3}
            rotate={-10}
          />
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;
