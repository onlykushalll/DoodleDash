import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const top = await db.playerStat.findMany({
      orderBy: { bestScore: "desc" },
      take: 50,
    });
    return NextResponse.json({ ok: true, leaderboard: top });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, leaderboard: [] }, { status: 200 });
  }
}
