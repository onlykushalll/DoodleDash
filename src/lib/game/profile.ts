// Local profile + portfolio persistence (localStorage only — no accounts/server).

export interface ProfileStats {
  games: number;
  wins: number;
  bestScore: number;
  totalScore: number;
  favoriteWord: string | null;
  wordsDrawn: number;
}

export interface PortfolioItem {
  word: string;
  dataUrl: string; // small thumbnail
  date: number;
}

const PROFILE_KEY = "dd-profile";
const PORTFOLIO_KEY = "dd-portfolio";
const MAX_PORTFOLIO = 30;

export function loadProfile(): ProfileStats | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveProfile(stats: ProfileStats) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(stats));
  } catch { /* ignore */ }
}

export function loadPortfolio(): PortfolioItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PORTFOLIO_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePortfolio(items: PortfolioItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(items.slice(0, MAX_PORTFOLIO)));
  } catch { /* ignore */ }
}

/**
 * Called on game-end. Updates local profile stats + saves the current user's
 * drawings from the gallery (filtered by drawerId === myId) as portfolio thumbnails.
 */
export function updateProfileAfterGame(
  finalScores: Record<string, number>,
  myId: string,
  players: Array<{ id: string; name: string; score: number }>,
  gallery: Array<{ word: string; drawerId: string; strokes: any[]; shapes: any[] }>
) {
  if (typeof window === "undefined") return;
  const myScore = finalScores[myId] ?? 0;
  const sorted = [...players].sort((a, b) => (finalScores[b.id] ?? b.score) - (finalScores[a.id] ?? a.score));
  const won = sorted[0]?.id === myId;

  const prev = loadProfile() ?? {
    games: 0, wins: 0, bestScore: 0, totalScore: 0, favoriteWord: null, wordsDrawn: 0,
  };

  // Track word frequency for favoriteWord
  const wordCounts: Record<string, number> = {};
  try {
    const raw = localStorage.getItem("dd-word-history");
    if (raw) {
      const arr: string[] = JSON.parse(raw);
      for (const w of arr) wordCounts[w] = (wordCounts[w] || 0) + 1;
    }
  } catch { /* ignore */ }

  const myDrawings = gallery.filter((g) => g.drawerId === myId);
  for (const d of myDrawings) {
    wordCounts[d.word] = (wordCounts[d.word] || 0) + 1;
  }
  const favoriteWord = Object.entries(wordCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  try {
    localStorage.setItem("dd-word-history", JSON.stringify([...Object.keys(wordCounts)]));
  } catch { /* ignore */ }

  const next: ProfileStats = {
    games: prev.games + 1,
    wins: prev.wins + (won ? 1 : 0),
    bestScore: Math.max(prev.bestScore, myScore),
    totalScore: prev.totalScore + myScore,
    favoriteWord,
    wordsDrawn: prev.wordsDrawn + myDrawings.length,
  };
  saveProfile(next);

  // Save portfolio thumbnails (render strokes to small canvas)
  const portfolio = loadPortfolio();
  for (const d of myDrawings) {
    const dataUrl = renderGalleryItem(d.strokes, d.shapes);
    if (dataUrl) {
      portfolio.unshift({ word: d.word, dataUrl, date: Date.now() });
    }
  }
  savePortfolio(portfolio);
}

// Render gallery strokes to a small data URL thumbnail.
function renderGalleryItem(strokes: any[], shapes: any[]): string | null {
  if (typeof document === "undefined") return null;
  try {
    const c = document.createElement("canvas");
    c.width = 120;
    c.height = 120;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 120, 120);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const W = 1200, H = 720; // logical coords used by strokes
    for (const s of strokes) {
      if (!s.points || s.points.length === 0) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = Math.max(1, (s.size || 4) * 0.1);
      ctx.globalAlpha = s.brush === "marker" ? 0.35 : s.brush === "pencil" ? 0.5 : 1;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x * 120, s.points[0].y * 120);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x * 120, s.points[i].y * 120);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return c.toDataURL("image/png");
  } catch {
    return null;
  }
}
