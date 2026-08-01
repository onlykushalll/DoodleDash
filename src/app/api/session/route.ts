import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const TWO_HOURS = 2 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionToken, roomCode, name, avatar, color, customAvatar, isSpectator, score } = body;

    if (!sessionToken || !roomCode || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + TWO_HOURS);

    const session = await db.session.upsert({
      where: { sessionToken },
      update: {
        roomCode,
        name: name.slice(0, 24),
        avatar: avatar || "🐱",
        color: color || "#f97316",
        customAvatar: customAvatar || null,
        isSpectator: !!isSpectator,
        score: typeof score === "number" ? score : 0,
        expiresAt,
      },
      create: {
        sessionToken,
        roomCode,
        name: name.slice(0, 24),
        avatar: avatar || "🐱",
        color: color || "#f97316",
        customAvatar: customAvatar || null,
        isSpectator: !!isSpectator,
        score: typeof score === "number" ? score : 0,
        expiresAt,
      },
    });

    return NextResponse.json({ ok: true, id: session.id });
  } catch (e) {
    console.error("[api/session] save error", e);
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionToken } = body;

    if (!sessionToken) {
      return NextResponse.json({ error: "Missing sessionToken" }, { status: 400 });
    }

    const session = await db.session.findUnique({
      where: { sessionToken },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await db.session.delete({ where: { id: session.id } }).catch(() => {});
      }
      return NextResponse.json({ ok: false, error: "No valid session" });
    }

    return NextResponse.json({
      ok: true,
      session: {
        roomCode: session.roomCode,
        name: session.name,
        avatar: session.avatar,
        color: session.color,
        customAvatar: session.customAvatar,
        isSpectator: session.isSpectator,
        score: session.score,
      },
    });
  } catch (e) {
    console.error("[api/session] restore error", e);
    return NextResponse.json({ error: "Failed to restore session" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (token) {
      await db.session.deleteMany({ where: { sessionToken: token } });
    }
    // Also clean up expired sessions
    await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/session] delete error", e);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}
