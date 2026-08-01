const LS_KEY = "dd-session";
const TOKEN_KEY = "dd-session-token";
const COOKIE_NAME = "dd-st";
const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface GameSession {
  sessionToken: string;
  roomCode: string;
  name: string;
  avatar: string;
  color: string;
  customAvatar?: string | null;
  isSpectator?: boolean;
  score?: number;
  savedAt: number;
}

function generateToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function setCookie(token: string) {
  const expires = new Date(Date.now() + TTL_MS).toUTCString();
  document.cookie = `${COOKIE_NAME}=${token};path=/;expires=${expires};SameSite=Lax`;
}

function getCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? match[1] : null;
}

function clearCookie() {
  document.cookie = `${COOKIE_NAME}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function getSessionToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(TOKEN_KEY) || getCookie();
  if (!token) {
    token = generateToken();
    localStorage.setItem(TOKEN_KEY, token);
    setCookie(token);
  } else {
    // Keep both in sync
    try { localStorage.setItem(TOKEN_KEY, token); } catch {}
    setCookie(token);
  }
  return token;
}

export function saveSession(data: Omit<GameSession, "sessionToken" | "savedAt">): GameSession {
  const sessionToken = getSessionToken();
  const session: GameSession = {
    ...data,
    sessionToken,
    savedAt: Date.now(),
  };

  try {
    localStorage.setItem(LS_KEY, JSON.stringify(session));
  } catch {}

  // Fire-and-forget DB save
  fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionToken,
      roomCode: data.roomCode,
      name: data.name,
      avatar: data.avatar,
      color: data.color,
      customAvatar: data.customAvatar || null,
      isSpectator: data.isSpectator || false,
      score: data.score || 0,
    }),
  }).catch(() => {});

  return session;
}

export function updateSessionScore(score: number) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const session: GameSession = JSON.parse(raw);
    session.score = score;
    session.savedAt = Date.now();
    localStorage.setItem(LS_KEY, JSON.stringify(session));

    fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionToken: session.sessionToken,
        roomCode: session.roomCode,
        name: session.name,
        avatar: session.avatar,
        color: session.color,
        customAvatar: session.customAvatar || null,
        isSpectator: session.isSpectator || false,
        score,
      }),
    }).catch(() => {});
  } catch {}
}

export function getLocalSession(): GameSession | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const session: GameSession = JSON.parse(raw);
    if (Date.now() - session.savedAt > TTL_MS) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function restoreSession(): Promise<GameSession | null> {
  // Try localStorage first
  const local = getLocalSession();
  if (local) return local;

  // Try cookie-based DB restore
  const token = getCookie() || localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  try {
    const res = await fetch("/api/session", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken: token }),
    });
    const data = await res.json();
    if (data.ok && data.session) {
      const session: GameSession = {
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
      // Re-save to localStorage
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(session));
        localStorage.setItem(TOKEN_KEY, token);
      } catch {}
      setCookie(token);
      return session;
    }
  } catch {}

  return null;
}

export function clearSession() {
  const token = localStorage.getItem(TOKEN_KEY) || getCookie();
  try { localStorage.removeItem(LS_KEY); } catch {}
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
  clearCookie();

  if (token) {
    fetch(`/api/session?token=${encodeURIComponent(token)}`, { method: "DELETE" }).catch(() => {});
  }
}
