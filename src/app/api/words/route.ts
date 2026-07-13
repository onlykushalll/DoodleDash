import { NextResponse } from "next/server";
import { WORD_LISTS } from "@/lib/game/words";

export async function GET() {
  return NextResponse.json({
    ok: true,
    lists: WORD_LISTS,
    counts: {
      easy: WORD_LISTS.easy.length,
      medium: WORD_LISTS.medium.length,
      hard: WORD_LISTS.hard.length,
    },
  });
}
