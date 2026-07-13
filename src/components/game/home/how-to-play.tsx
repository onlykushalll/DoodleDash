"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

interface Step {
  icon: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: "🏠",
    title: "Create a room",
    body: "Pick a name, avatar and color, then share the 5-character code with your friends.",
  },
  {
    icon: "🎨",
    title: "Draw & guess",
    body: "Take turns drawing a secret word while everyone races to guess. Brushes, shapes, fills — your call.",
  },
  {
    icon: "🏆",
    title: "Score & win",
    body: "Faster guesses earn more points. Highest score after the last round takes the crown.",
  },
];

export interface HowToPlayProps {
  className?: string;
}

export function HowToPlay({ className }: HowToPlayProps) {
  return (
    <Card className={`rounded-3xl border-border p-5 shadow-soft sm:p-6 ${className ?? ""}`}>
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-base">
          📖
        </span>
        <h2 className="text-lg font-bold">How to play</h2>
      </div>
      <ol className="space-y-3">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="flex items-start gap-3 rounded-2xl border border-border bg-surface-2/50 p-3"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-card text-xl shadow-soft">
              {s.icon}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-accent">
                  Step {i + 1}
                </span>
                <h3 className="text-sm font-semibold">{s.title}</h3>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{s.body}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </Card>
  );
}

export default HowToPlay;
