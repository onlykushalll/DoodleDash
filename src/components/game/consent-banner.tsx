"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { sfx } from "@/lib/game/sound";

export function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("dd-consent");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!consent) setShow(true);
    } catch {
      // localStorage might not be available (e.g. Safari private mode), default to not showing banner to prevent crash
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem("dd-consent", "accepted");
    } catch {
      // Ignore write errors
    }
    setShow(false);
    sfx.click();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-[200] border-t bg-card p-4 shadow-float"
        >
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground sm:text-sm">
              We store your theme, preferences, and profile locally in your browser.
              No accounts, no tracking. OK?
            </p>
            <Button size="sm" onClick={accept} className="shrink-0 rounded-xl">
              Got it
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
