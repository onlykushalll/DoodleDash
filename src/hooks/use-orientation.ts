"use client";

import { useSyncExternalStore } from "react";

function getIsPortableMobile(): boolean {
  if (typeof window === "undefined") return false;
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  return minDim <= 768;
}

function getIsPortrait(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerHeight > window.innerWidth;
}

function getIsLandscape(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth > window.innerHeight;
}

function subscribe(cb: () => void) {
  window.addEventListener("resize", cb);
  window.addEventListener("orientationchange", cb);
  return () => {
    window.removeEventListener("resize", cb);
    window.removeEventListener("orientationchange", cb);
  };
}

export function useOrientation() {
  const isMobile = useSyncExternalStore(subscribe, getIsPortableMobile, () => false);
  const isPortrait = useSyncExternalStore(subscribe, getIsPortrait, () => false);
  const isLandscape = useSyncExternalStore(subscribe, getIsLandscape, () => true);

  return {
    isMobile,
    isPortrait,
    isLandscape,
    isMobileLandscape: isMobile && isLandscape,
    isMobilePortrait: isMobile && isPortrait,
  };
}
