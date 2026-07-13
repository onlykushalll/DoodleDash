"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGameStore, selectIsDrawer } from "@/lib/game/store";
import { getSocket } from "@/hooks/use-game-socket";
import { sfx } from "@/lib/game/sound";

export function WordChoiceOverlay() {
  const wordChoices = useGameStore((s) => s.wordChoices);
  const isDrawer = useGameStore(selectIsDrawer);
  const stage = useGameStore((s) => s.room?.stage);

  const show = stage === "choosing" && isDrawer && wordChoices && wordChoices.length > 0;

  const choose = (index: number) => {
    sfx.choose();
    getSocket().emit("game:choose-word", { wordIndex: index });
    useGameStore.getState().setWordChoices(null);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-40 grid place-items-center bg-black/30 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="w-full max-w-lg rounded-3xl border bg-card p-6 shadow-float sm:p-8"
          >
            <div className="mb-1 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Your turn to draw
            </div>
            <h2 className="mb-5 text-center text-xl font-extrabold sm:text-2xl">
              Choose a word
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {wordChoices!.map((word, i) => (
                <motion.button
                  key={word + i}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => choose(i)}
                  className="bg-grad relative rounded-2xl px-4 py-6 text-center font-bold text-white shadow-soft transition sm:py-8"
                >
                  <span className="text-lg capitalize sm:text-xl">{word}</span>
                  <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-white/70">
                    {word.length} letters
                  </span>
                </motion.button>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Pick quickly — a word will be chosen for you if you wait too long.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default WordChoiceOverlay;
