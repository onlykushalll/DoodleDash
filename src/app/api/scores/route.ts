import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

// Simple in-memory rate limiting (per IP, reset every 60s)
const rateLimit = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.reset) {
    rateLimit.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// Verify the game-end token (HMAC of scores + room code + timestamp)
function verifyToken(token: string, body: string): boolean {
  const secret = process.env.SCORE_SECRET || "doodle-dash-secret-2024";
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    // Rate limit
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
    }

    // Verify token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const rawBody = await req.text();
    if (!verifyToken(token, rawBody)) {
      return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 403 });
    }

    const body = JSON.parse(rawBody);
    const players: Array<{ name: string; avatar?: string; color?: string; score: number; won?: boolean }> =
      body?.players ?? [];
    if (!Array.isArray(players) || players.length === 0) {
      return NextResponse.json({ ok: false, error: "no players" }, { status: 400 });
    }

    for (const p of players) {
      const name = (p.name || "").trim().slice(0, 24);
      if (!name) continue;
      const avatar = p.avatar || "🐱";
      const color = p.color || "#ff7a59";
      const score = Math.max(0, Math.floor(Number(p.score) || 0));
      const won = !!p.won;

      await db.playerStat.upsert({
        where: { name },
        create: { name, avatar, color, games: 1, wins: won ? 1 : 0, bestScore: score, totalScore: score },
        update: {
          games: { increment: 1 },
          wins: { increment: won ? 1 : 0 },
          bestScore: score,
          totalScore: { increment: score },
          avatar,
          color,
        },
      });

      const existing = await db.playerStat.findUnique({ where: { name } });
      if (existing && score > existing.bestScore) {
        await db.playerStat.update({ where: { name }, data: { bestScore: score } });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/scores] error:", e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
