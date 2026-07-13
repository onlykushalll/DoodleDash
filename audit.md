# Site Audit Report
**Date:** 2025-01-13
**Project:** Doodle Dash — Multiplayer Drawing & Guessing Game
**Detected stack:** Next.js 16.1.1, TypeScript 5, Tailwind CSS 4, shadcn/ui (Radix), Socket.io 4.8, Prisma 6.11 + SQLite, Framer Motion 12, Zustand 5, Bun runtime
**Detected audience/goal:** Casual gamers and friend groups (ages 8+) seeking a free, browser-based Pictionary-style multiplayer game. No accounts, instant play.
**Design system maturity:** Tokenized — full CSS variable system with 4 switchable light themes (peach/mint/sky/lavender), shadcn/ui component library, consistent radius/spacing scale.

---

## Anti-Pattern Verdict
Does this look AI-generated? **Partially.** Specific tells:
- **Inter font** (`src/app/layout.tsx:2`) — the #1 most common AI-tool default font. No typographic personality.
- **Gradient text** (`.text-grad` class in `globals.css:283`) — used on "Draw. Guess. Laugh." and "Dash" in the logo. Decorative gradient text is a hallmark AI tell.
- **Emoji as structural icons** — avatar system (`AVATARS` array in `types.ts:195`) uses emoji as user identity icons, and queen-arrival overlay (`queen-arrival-overlay.tsx:52`) uses 👑 as a structural element rather than an SVG.
- **Glassmorphism** (`.glass` class in `globals.css:294`) — used decoratively on headers and toolbars.

**But** the design also has intentional, non-generic choices that save it from "AI slop":
- 4 distinctive warm pastel themes (peach/mint/sky/lavender) — NOT the default indigo/purple.
- Custom inline-SVG logo (pencil drawing a squiggle) — not a stock icon.
- No fabricated metrics, no testimonial carousel, no "3-col features then CTA" template.
- The layout is genuinely game-specific (canvas-centric, not marketing-page).

Score: **3/4** — 3 tells present (Inter, gradient text, emoji-as-icon), but distinctive enough to not be slop.

---

## Audit Health Score

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2/4 | `userScalable: false` blocks pinch-zoom (WCAG 1.4.4 violation); 11 touch targets under 44px |
| 2 | Performance | 2/4 | ~10 unused npm packages (@dnd-kit, @mdxeditor, next-auth, next-intl, recharts, etc.) inflate bundle by ~2MB |
| 3 | Security | 2/4 | `/api/scores` POST has no authentication or rate limiting — anyone can submit fake scores |
| 4 | Theming and design system | 3/4 | Full token system with 4 themes; dark mode defined but unused |
| 5 | Responsive design | 3/4 | Good breakpoints; touch targets consistently 36px instead of 44px |
| 6 | Anti-patterns | 3/4 | Inter font + gradient text + emoji icons, but saved by distinctive themes |
| | **Total** | **15/24** | **Acceptable** — address weak dimensions before launch |

**Legal and compliance flags:** Privacy Policy [present at /privacy, linked in footer] - Terms [missing] - Cookie consent [missing] - GDPR signals [missing] - COPPA [missing]

---

## Executive Summary
Doodle Dash is a well-structured multiplayer drawing game with a mature design token system and thoughtful game mechanics (pause-on-disconnect, spectator promotion, queen arrival). The codebase is clean of AI service dependencies and has good input validation on the game server. However, it has a WCAG-violating viewport lock, an unauthenticated score-submission API that anyone can abuse, ~10 unused npm packages bloating the bundle by ~2MB, and is missing Terms of Service and cookie consent — creating FTC and GDPR exposure if monetized or served to EU/under-13 users. Fix the security gap and the viewport lock before launch; the rest is polish.

Total findings by severity: P0 [1] - P1 [4] - P2 [4] - P3 [3]

---

## Quick Wins
1. **Remove `userScalable: false, maximumScale: 1`** from `src/app/layout.tsx:38-39` (P1) — one-line fix, unblocks accessibility compliance
2. **Add basic auth to `/api/scores`** — check for a valid room code or session token before accepting POST (P0) — prevents score injection
3. **Remove unused npm packages** from `package.json` — `@dnd-kit/*`, `@mdxeditor/editor`, `next-auth`, `next-intl`, `recharts`, `react-syntax-highlighter`, `react-day-picker` (P2) — cuts bundle ~2MB
4. **Delete dead file** `src/components/game/home/leaderboard-preview.tsx` (P3) — not imported anywhere, ships for no reason

---

## Findings

### P0 — Blocking

#### Unauthenticated score submission
- **Category:** Security
- **Location:** `src/app/api/scores/route.ts:8-46`
- **Issue:** The POST endpoint accepts arbitrary JSON with player names and scores, performs no authentication, no rate limiting, and no origin verification. Anyone can POST `{"players":[{"name":"Cheater","score":99999,"won":true}]}` and pollute the leaderboard.
- **User impact:** Leaderboard can be spammed with fake high scores, destroying the competitive integrity of the game. A single curl command can submit unlimited fake entries.
- **Fix:** Require a one-time token generated at game-end. Add a simple rate limit.

**Snippet — `src/app/api/scores/route.ts` (replace entire file):**
```typescript
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
          avatar, color,
        },
      });

      const existing = await db.playerStat.findUnique({ where: { name } });
      if (existing && score > existing.bestScore) {
        await db.playerStat.update({ where: { name }, data: { bestScore: score } });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
```

**Snippet — `src/components/game/play/game-end-overlay.tsx` (update the fetch call):**
```typescript
import crypto from "crypto";

// Inside the useEffect, before the fetch:
const body = JSON.stringify({
  players: room.players.map((p) => ({
    name: p.name, avatar: p.avatar, score: p.score,
    won: top ? p.id === top.id : false,
  })),
});
const secret = process.env.NEXT_PUBLIC_SCORE_SECRET || "doodle-dash-secret-2024";
const token = crypto.createHmac("sha256", secret).update(body).digest("hex");

void fetch("/api/scores", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  },
  body,
}).catch(() => {});
```

**Add to `.env` and `.env.example`:**
```
SCORE_SECRET=your-random-secret-here
NEXT_PUBLIC_SCORE_SECRET=your-random-secret-here
```

---

### P1 — Major

#### Viewport zoom disabled (WCAG 1.4.4 violation)
- **Category:** Accessibility
- **Location:** `src/app/layout.tsx:38-39`
- **Issue:** `maximumScale: 1, userScalable: false` prevents users from pinch-zooming on mobile.
- **User impact:** Low-vision users on mobile cannot zoom in to read text or see the canvas clearly.

**Snippet — `src/app/layout.tsx`:**
```typescript
// FIND:
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fff8f3" }],
};

// REPLACE WITH:
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fff8f3" }],
};
```

---

#### Touch targets below 44x44px
- **Category:** Accessibility / Responsive design
- **Location:** `src/components/game/play/play-screen.tsx`, `src/components/game/play/drawing-toolbar.tsx`, `src/components/game/home/home-screen.tsx`
- **Issue:** 11 instances of `size-9` (36px) buttons. WCAG 2.5.5 recommends 44x44px.
- **User impact:** Mobile users with large fingers mis-tap toolbar buttons.

**Snippet — global find and replace across `src/components/game/`:**
```
// FIND:  size-9     REPLACE WITH: size-11
// FIND:  size-10    REPLACE WITH: size-11
// FIND:  h-8 w-8    REPLACE WITH: h-11 w-11
// FIND:  h-7 w-7    REPLACE WITH: h-11 w-11
```

**Color swatches — keep small but add spacing:**
```tsx
// In drawing-toolbar.tsx, FIND:
                  className={cn(
                    "size-5 rounded-md border-2 transition-all hover:scale-110",

// REPLACE WITH:
                  className={cn(
                    "size-8 rounded-md border-2 transition-all hover:scale-110",
```

---

#### Terms of Service missing
- **Category:** Legal and compliance
- **Location:** Footer in `src/components/game/home/home-screen.tsx:137-143`

**Snippet — create `src/app/terms/page.tsx`:**
```tsx
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Terms of Service — Doodle Dash" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6 text-foreground">
        <h1 className="text-3xl font-extrabold tracking-tight">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: January 2025</p>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">1. Acceptable Use</h2>
          <p className="text-sm text-muted-foreground">
            By using Doodle Dash, you agree to play fairly and respectfully. You may not:
            submit offensive drawings, harass other players, spam chat, use bots or
            automation, or attempt to disrupt the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">2. User-Generated Content</h2>
          <p className="text-sm text-muted-foreground">
            Drawings, chat messages, and custom avatars you create are your responsibility.
            You grant Doodle Dash a non-exclusive license to display and remove your content
            within the game. We reserve the right to remove any content we find inappropriate.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">3. No Warranty</h2>
          <p className="text-sm text-muted-foreground">
            Doodle Dash is provided "as is" without warranty of any kind. We do not guarantee
            uninterrupted service availability.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">4. Limitation of Liability</h2>
          <p className="text-sm text-muted-foreground">
            Doodle Dash and its creator shall not be liable for any damages arising from
            the use of this service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">5. Privacy</h2>
          <p className="text-sm text-muted-foreground">
            We collect no personal data. See our <a href="/privacy" className="underline">Privacy Policy</a>.
          </p>
        </section>

        <p className="pt-6 text-sm font-semibold">Made with ❤️ by ~Kushal</p>
      </div>
    </div>
  );
}
```

**Snippet — add ToS link in footer (`src/components/game/home/home-screen.tsx`):**
```tsx
// ADD before the kushalneedsmcp.online link:
            <a
              href="/terms"
              className="rounded-full px-2 py-1 transition hover:text-foreground"
              onClick={() => sfx.click()}
            >
              Terms
            </a>
```

---

#### No cookie/storage consent
- **Category:** Legal and compliance
- **Location:** Multiple files write to localStorage without consent

**Snippet — create `src/components/game/consent-banner.tsx`:**
```tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { sfx } from "@/lib/game/sound";

export function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("dd-consent");
    if (!consent) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem("dd-consent", "accepted");
    setShow(false);
    sfx.click();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-[200] border-t bg-card p-4 shadow-float"
        >
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground sm:text-sm">
              We store your theme, preferences, and profile locally in your browser.
              No accounts, no tracking. OK?
            </p>
            <Button size="sm" onClick={accept} className="shrink-0 rounded-xl">
              Got it
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Snippet — `src/app/page.tsx` (add ConsentBanner):**
```tsx
// ADD import:
import { ConsentBanner } from "@/components/game/consent-banner";

// ADD before the closing </>:
    <>
      {screen}
      <QueenArrivalOverlay />
      <ConsentBanner />
    </>
```

---

### P2 — Minor

#### Unused npm packages inflating bundle
- **Category:** Performance
- **Location:** `package.json:16-82`

**Snippet — `package.json` (remove these from dependencies):**
```json
// Remove these lines:
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@mdxeditor/editor": "^3.39.1",
    "next-auth": "^4.24.11",
    "next-intl": "^4.3.4",
    "react-syntax-highlighter": "^15.6.1",
    "react-day-picker": "^9.8.0",
    "recharts": "^2.15.4",
    "react-resizable-panels": "^3.0.3",
```

**Also delete:**
```bash
rm src/components/ui/chart.tsx
rm src/components/ui/calendar.tsx
```

**Then run:**
```bash
bun install
```

---

#### /api/words exposes all word lists publicly
- **Category:** Security
- **Location:** `src/app/api/words/route.ts:1-12`

**Snippet — replace entire file:**
```typescript
import { NextResponse } from "next/server";
import { WORD_LISTS } from "@/lib/game/words";

// Only return counts, never the actual words.
export async function GET() {
  return NextResponse.json({
    ok: true,
    counts: {
      easy: WORD_LISTS.easy.length,
      medium: WORD_LISTS.medium.length,
      hard: WORD_LISTS.hard.length,
    },
  });
}
```

---

#### Dead leaderboard code still in repo
- **Category:** Performance / maintainability

**Snippet:**
```bash
rm src/components/game/home/leaderboard-preview.tsx
```

---

#### Focus-visible coverage is low
- **Category:** Accessibility

**Snippet — add to all raw `<button>` elements in game components:**
```tsx
className="... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

---

### P3 — Polish

#### Error messages expose internal details
- **Category:** Security / error recovery
- **Location:** `src/app/api/scores/route.ts:48`, `src/app/api/leaderboard/route.ts:11`

**Snippet — `src/app/api/scores/route.ts`:**
```typescript
// FIND:
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }

// REPLACE WITH:
  } catch (e) {
    console.error("[/api/scores] error:", e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
```

**Snippet — `src/app/api/leaderboard/route.ts`:**
```typescript
// FIND:
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, leaderboard: [] }, { status: 200 });
  }

// REPLACE WITH:
  } catch (e) {
    console.error("[/api/leaderboard] error:", e);
    return NextResponse.json({ ok: false, error: "Internal error", leaderboard: [] }, { status: 200 });
  }
```

---

#### CORS wildcard on game server
- **Category:** Security
- **Location:** `mini-services/game-server/index.ts:751`

**Snippet:**
```typescript
// FIND:
  cors: { origin: '*', methods: ['GET', 'POST'] },

// REPLACE WITH:
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST'],
  },
```

**Add to `.env.example`:**
```
ALLOWED_ORIGINS=https://doodle.kushalneedsmcp.online
```

---

#### `reactStrictMode: false`
- **Category:** Performance / code quality
- **Location:** `next.config.ts:9`

**Snippet:**
```typescript
// FIND:
  reactStrictMode: false,

// REPLACE WITH:
  reactStrictMode: true,
```

---

## Systemic Patterns

### 1. Touch targets systematically undersized
Across the play screen header (`size-9` buttons), the drawing toolbar (`size-10`), and the home header (`size-9`), touch targets are consistently 36-40px instead of the WCAG-recommended 44px. This is systemic — the design system's default button size is too small for touch interfaces.

### 2. Dead code from iterative development
The codebase shows clear evidence of feature addition and removal without cleanup: `leaderboard-preview.tsx` (removed from UI, file remains), `chart.tsx` and `calendar.tsx` (shadcn components installed but never used). This is a "remove the import, not the file" workflow that accumulates dead code.

### 3. localStorage without consent or error boundaries
Every feature that persists user data (theme, canvas prefs, cosmetics, buddies, profile) writes to localStorage directly, without: (a) checking if localStorage is available (Safari private mode throws), (b) wrapping in try/catch at the call site (some do, some don't), or (c) obtaining user consent. This is a systemic pattern across 6+ files.

---

## Strengths

1. **Input validation on the game server is thorough.** `mini-services/game-server/index.ts` sanitizes every user input: names are sliced to 24 chars (`line 482`), chat messages to 200 chars (`line 614`), customAvatar is validated for data URL prefix + size limit (`line 477`), and word choices are bounds-checked (`line 337`). This prevents most injection and abuse vectors at the protocol level.

2. **The reconnect/pause system is well-engineered.** The `maybePause`/`maybeResume` functions (`lines 193-243`) with the 20-second grace period, spectator promotion, and automatic host reassignment handle every player-disconnect edge case. This is production-grade resilience that most multiplayer games skip.

3. **The 4-theme CSS variable system is genuinely well-structured.** `globals.css` defines complete token sets for peach/mint/sky/lavender with consistent naming. Every component uses tokens — zero hardcoded hex colors in game components. The theme provider correctly avoids hydration mismatch by starting with "peach" on both server and client, then syncing from localStorage in a useEffect.

---

## Recommended Priority Order

1. **Add authentication to `/api/scores`** (P0) — prevents anyone from submitting fake scores with a single curl command
2. **Remove `userScalable: false` from viewport** (P1) — one-line fix, unblocks WCAG compliance
3. **Create Terms of Service page** (P1) — user-generated content with no legal framework is a liability
4. **Increase touch targets to 44px** (P1) — change `size-9` to `size-11` across play screen and toolbar
5. **Add storage consent banner** (P1) — GDPR compliance for EU users
6. **Remove unused npm packages** (P2) — cuts ~2MB from the bundle
7. **Delete dead leaderboard code** (P2) — reduces attack surface and confusion
8. **Add focus-visible indicators** (P2) — improves keyboard navigation
9. **Fix error messages + CORS + strict mode** (P3) — polish for production hardening
