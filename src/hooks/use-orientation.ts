"use client";

import { useEffect, useState } from "react";

/**
 * Detects whether the viewport is a PHONE in landscape or portrait.
 * Used to switch the play screen to the mobile-optimized layouts.
 *
 * IMPORTANT: This is for PHONES ONLY. Tablets and desktops always get the
 * full desktop 3-column layout (scoreboard | canvas | chat), even in
 * portrait or narrow windows.
 *
 * A screen is considered a "phone" when:
 *   - The shorter dimension <= 500px (phones are typically 360-430px wide;
 *     tablets start at 768px+; desktops are 1000px+).
 *
 * This means:
 *   - iPhone (390×844): isMobilePortrait = true → stacked layout + rotate prompt
 *   - iPhone landscape (844×390): isMobileLandscape = true → 3-col mobile layout
 *   - iPad (768×1024): NOT mobile → desktop 3-col layout
 *   - Desktop (1920×1080): NOT mobile → desktop 3-col layout
 */
export function useOrientation() {
  const [state, setState] = useState<{
    isLandscape: boolean;
    isPortrait: boolean;
    isMobileLandscape: boolean;
    isMobilePortrait: boolean;
    vw: number;
    vh: number;
  }>({
    isLandscape: true,
    isPortrait: false,
    isMobileLandscape: false,
    isMobilePortrait: false,
    vw: 0,
    vh: 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isLandscape = vw >= vh;
      const isPortrait = !isLandscape;
      const minDim = Math.min(vw, vh);
      // PHONES ONLY: shorter side <= 500px. Tablets (768px+) and desktops
      // are NOT considered mobile — they get the full desktop layout.
      const isPhone = minDim <= 500;
      setState({
        isLandscape,
        isPortrait,
        isMobileLandscape: isLandscape && isPhone,
        isMobilePortrait: isPortrait && isPhone,
        vw,
        vh,
      });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, []);

  return state;
}
