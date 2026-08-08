"use client";

// ----------------------------------------------------------------------------
// Session persistence — triple-fallback: localStorage → cookie → DB.
// ----------------------------------------------------------------------------
// Survives:
//   1. Page reload (localStorage)
//   2. Tab close + reopen (cookie)
//   3. Browser data cleared (DB)
//
// We persist the player's identity + room code so that on reload we can
// auto-rejoin the same room (the server matches by name on rejoin, restoring
// the seat + score).
// ----------------------------------------------------------------------------

export interface SavedSession {
  sessionToken?: string;
  roomCode: string;
  name: string;
  avatar: string;
  color: string;
  customAvatar: string | null;
  isSpectator: boolean;
  score?: number;
  savedAt: number; // epoch ms — used to expire stale sessions
}

const KEY = "dd-session";
const TOKEN_KEY = "dd-session-token";
const COOKIE_NAME = "dd-st";
// Sessions expire after 2 hours (server rooms are likely gone by then).
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

// Generate a random session token
function generateToken(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID().replace(/-/g, "");
    }
  } catch {
    /* noop */
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---- Cookie helpers ----
function setCookie(name: string, value: string, maxAgeMs: number): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + maxAgeMs).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// ---- localStorage ----
export function saveSession(s: SavedSession): void {
  if (typeof window === "undefined") return;
  try {
    // Ensure we have a session token
    if (!s.sessionToken) {
      s.sessionToken = generateToken();
    }
    localStorage.setItem(KEY, JSON.stringify(s));
    localStorage.setItem(TOKEN_KEY, s.sessionToken);
    // Also set cookie (survives tab close)
    setCookie(COOKIE_NAME, s.sessionToken, MAX_AGE_MS);
    // Also save to DB (survives browser data clear) — fire and forget
    saveSessionToDB(s).catch(() => {
      /* ignore — DB is best-effort */
    });
  } catch {
    /* storage full / disabled — ignore */
  }
}

export function loadSession(): SavedSession | null {
  if (typeof window === "undefined") return null;
  try {
    // 1. Try localStorage
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedSession;
      if (parsed && parsed.roomCode && typeof parsed.savedAt === "number") {
        if (Date.now() - parsed.savedAt <= MAX_AGE_MS) {
          return parsed;
        }
        localStorage.removeItem(KEY);
      }
    }
    // 2. Try cookie (survives tab close but localStorage cleared)
    const token = getCookie(COOKIE_NAME);
    if (token) {
      // Can't synchronously restore from DB here — return a placeholder
      // that the socket hook can use to trigger a DB restore.
      return null; // DB restore is async — handled in restoreSession()
    }
    return null;
  } catch {
    return null;
  }
}

// ---- DB restore (async) ----
// Called on page load if localStorage is empty. Fetches the session from the
// DB using the cookie token, and re-populates localStorage.
export async function restoreSession(): Promise<SavedSession | null> {
  if (typeof window === "undefined") return null;
  try {
    // Check localStorage first
    const local = loadSession();
    if (local) return local;

    // Try cookie token
    const token = getCookie(COOKIE_NAME) || localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    const res = await fetch("/api/session", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken: token }),
    });
    if (!res.ok) {
      deleteCookie(COOKIE_NAME);
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    const data = await res.json();
    if (!data.ok || !data.session) return null;

    const restored: SavedSession = {
      sessionToken: token,
      roomCode: data.session.roomCode,
      name: data.session.name,
      avatar: data.session.avatar,
      color: data.session.color,
      customAvatar: data.session.customAvatar,
      isSpectator: data.session.isSpectator,
      score: data.session.score,
      savedAt: Date.now(),
    };
    // Re-populate localStorage so future loads are synchronous
    localStorage.setItem(KEY, JSON.stringify(restored));
    localStorage.setItem(TOKEN_KEY, token);
    return restored;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    const token = localStorage.getItem(TOKEN_KEY) || getCookie(COOKIE_NAME);
    localStorage.removeItem(KEY);
    localStorage.removeItem(TOKEN_KEY);
    deleteCookie(COOKIE_NAME);
    // Also clear from DB — fire and forget
    if (token) {
      fetch("/api/session", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken: token }),
      }).catch(() => {
        /* ignore */
      });
    }
  } catch {
    /* ignore */
  }
}

// ---- DB helpers (fire and forget) ----
async function saveSessionToDB(s: SavedSession): Promise<void> {
  if (!s.sessionToken) return;
  await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionToken: s.sessionToken,
      roomCode: s.roomCode,
      name: s.name,
      avatar: s.avatar,
      color: s.color,
      customAvatar: s.customAvatar,
      isSpectator: s.isSpectator,
    }),
  });
}

export async function updateSessionScore(
  sessionToken: string,
  score: number
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken,
        roomCode: "",
        name: "",
        score,
      }),
    });
  } catch {
    /* ignore */
  }
}

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || getCookie(COOKIE_NAME);
}

// ----------------------------------------------------------------------------
// Rejoin attempt tracking — so the UI can show a "Reconnecting to room..."
// overlay while we wait for the server's ack.
// ----------------------------------------------------------------------------

let pendingRejoin: { roomCode: string; attempts: number } | null = null;

export function setPendingRejoin(roomCode: string | null): void {
  pendingRejoin = roomCode ? { roomCode, attempts: 0 } : null;
}

export function getPendingRejoin(): string | null {
  return pendingRejoin?.roomCode ?? null;
}

export function bumpRejoinAttempt(): number {
  if (!pendingRejoin) return 0;
  pendingRejoin.attempts += 1;
  return pendingRejoin.attempts;
}
