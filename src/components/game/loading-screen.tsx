"use client";

import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-background">
      {/* Soft radial glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(600px 400px at 50% 45%, var(--accent-soft) 0%, transparent 70%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-6">
        {/* Animated brush + logo */}
        <div className="relative h-32 w-64">
          {/* The logo mark appears as the brush "paints" it */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.5, type: "spring", stiffness: 200, damping: 15 }}
          >
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-grad shadow-float">
              <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
                <motion.path
                  d="M3 24 Q 8 14, 13 20 T 23 18"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.3, duration: 1.2, ease: "easeInOut" }}
                />
                <motion.path
                  d="M20 11 L27 4 L29 6 L22 13 Z"
                  fill="white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.4, duration: 0.3 }}
                />
              </svg>
            </div>
          </motion.div>

          {/* The paint brush that "paints" the logo — moves across then lifts */}
          <motion.div
            className="absolute"
            initial={{ x: -80, y: 10, rotate: -30, opacity: 0 }}
            animate={{
              x: [-80, -40, 0, 20, 0],
              y: [10, 0, -5, 5, -5],
              rotate: [-30, -20, -10, 0, -10],
              opacity: [0, 1, 1, 1, 0],
            }}
            transition={{
              duration: 1.5,
              times: [0, 0.15, 0.6, 0.85, 1],
              ease: "easeInOut",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M22 4 L28 10 L18 20 L12 14 Z" fill="var(--grad-to)" />
              <rect x="10" y="14" width="8" height="6" rx="1" fill="var(--grad-from)" transform="rotate(-45 14 17)" />
              <path d="M6 22 L10 26 L4 28 Z" fill="var(--accent)" opacity="0.6" />
            </svg>
          </motion.div>

          {/* Paint splatter dots */}
          {[
            { w: 8, h: 6, bg: "var(--grad-to)", left: "25%", top: "65%" },
            { w: 6, h: 8, bg: "var(--grad-from)", left: "70%", top: "55%" },
            { w: 7, h: 7, bg: "var(--accent)", left: "40%", top: "35%" },
            { w: 9, h: 5, bg: "var(--grad-to)", left: "60%", top: "70%" },
            { w: 5, h: 9, bg: "var(--grad-from)", left: "30%", top: "50%" },
            { w: 8, h: 8, bg: "var(--accent)", left: "75%", top: "40%" },
          ].map((dot, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{ width: dot.w, height: dot.h, background: dot.bg, left: dot.left, top: dot.top }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.7] }}
              transition={{ delay: 1 + i * 0.1, duration: 0.4 }}
            />
          ))}
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            Doodle <span className="text-grad">Dash</span>
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.4 }}
            className="mt-1 text-sm text-muted-foreground"
          >
            Draw. Guess. Laugh.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 2.0, duration: 0.4 }}
            className="mt-2 text-[10px] text-muted-foreground/60"
          >
            Loading your canvas…
          </motion.p>
        </motion.div>

        {/* Loading bar */}
        <motion.div
          className="h-1 w-40 overflow-hidden rounded-full bg-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          <motion.div
            className="h-full rounded-full bg-grad"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ delay: 1.4, duration: 1.0, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    </div>
  );
}

export default LoadingScreen;
