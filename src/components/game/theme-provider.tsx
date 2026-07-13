"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ThemeName } from "@/lib/game/types";

interface ThemeCtxValue {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

const ThemeCtx = createContext<ThemeCtxValue | null>(null);

const STORAGE_KEY = "dd-theme";

const VALID_THEMES: ThemeName[] = ["peach", "mint", "sky", "lavender"];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always start with "peach" on both server and client to avoid hydration mismatch.
  // The saved theme is applied in a useEffect after mount.
  const [theme, setThemeState] = useState<ThemeName>("peach");

  // On mount: read saved theme from localStorage and apply it.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
      if (saved && VALID_THEMES.includes(saved) && saved !== theme) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setThemeState(saved);
      }
    } catch {
      /* ignore */
    }
  }, [theme]);

  // Apply theme to <html data-theme> whenever it changes.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
