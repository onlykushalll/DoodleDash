import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const top = await db.playerStat.findMany({
      orderBy: { bestScore: "desc" },
      take: 50,
    });
    return NextResponse.json({ ok: true, leaderboard: top });
  } catch (e) {
    console.error("[/api/leaderboard] error:", e);
    return NextResponse.json({ ok: false, error: "Internal error", leaderboard: [] }, { status: 200 });
  }
}
