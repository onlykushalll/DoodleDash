import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/scores — record a finished game's results for global leaderboard.
// Only the host client posts (see GameEndOverlay), so this runs once per game.
// Uses atomic upsert on the unique `name` field to be race-safe.
export async function POST(req: Request) {
  try {
    const body = await req.json();
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
        create: {
          name,
          avatar,
          color,
          games: 1,
          wins: won ? 1 : 0,
          bestScore: score,
          totalScore: score,
        },
        update: {
          games: { increment: 1 },
          wins: { increment: won ? 1 : 0 },
          bestScore: score, // Prisma: setting to a value; we need max, handle below
          totalScore: { increment: score },
          avatar,
          color,
        },
      });

      // bestScore needs max() — Prisma can't do max in update, so do a second query if needed
      const existing = await db.playerStat.findUnique({ where: { name } });
      if (existing && score > existing.bestScore) {
        await db.playerStat.update({
          where: { name },
          data: { bestScore: score },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
