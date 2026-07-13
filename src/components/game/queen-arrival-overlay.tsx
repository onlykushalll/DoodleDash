"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/lib/game/store";

const QUEEN_COLORS = [
  "#ff69b4", "#ffd700", "#ff1493", "#ffb6c1", "#dda0dd",
  "#ff85a2", "#ffc8dd", "#c084fc", "#f0abfc", "#fbbf24",
];

export function QueenArrivalOverlay() {
  const queen = useGameStore((s) => s.queenArrival);

  // Generate confetti pieces (stable per arrival via ts key)
  const pieces = queen
    ? Array.from({ length: 80 }, (_, i) => ({
        id: `${queen.ts}-${i}`,
        left: Math.random() * 100,
        color: QUEEN_COLORS[i % QUEEN_COLORS.length],
        duration: 2 + Math.random() * 2,
        delay: Math.random() * 1.5,
        size: 6 + Math.random() * 10,
        shape: i % 3 === 0 ? "circle" : i % 3 === 1 ? "rect" : "heart",
      }))
    : [];

  return (
    <AnimatePresence>
      {queen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
          aria-live="polite"
        >
          {/* Confetti */}
          {pieces.map((p) => (
            <div
              key={p.id}
              className="confetti-piece absolute"
              style={{
                left: `${p.left}%`,
                top: "-5vh",
                width: p.size,
                height: p.shape === "rect" ? p.size * 1.4 : p.size,
                background: p.shape === "heart" ? "transparent" : p.color,
                borderRadius: p.shape === "circle" ? "999px" : "2px",
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                animationIterationCount: "infinite",
                animationTimingFunction: "linear",
                fontSize: p.size + 4,
                lineHeight: 1,
              }}
            >
              {p.shape === "heart" && <span style={{ color: p.color }}>❤</span>}
            </div>
          ))}

          {/* Queen banner */}
          <motion.div
            initial={{ scale: 0.5, y: -100, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: -50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 text-center"
          >
            <div className="mb-2 text-6xl animate-bounce" aria-hidden>
              👑
            </div>
            <div
              className="rounded-2xl border-2 border-pink-300 bg-white/95 px-8 py-4 shadow-float backdrop-blur"
              style={{ boxShadow: "0 0 40px rgba(255,105,180,0.4)" }}
            >
              <p className="text-2xl font-extrabold text-pink-600">
                {queen.name}
              </p>
              <p className="text-sm font-semibold text-pink-400">
                The Queen has arrived 👑
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default QueenArrivalOverlay;
