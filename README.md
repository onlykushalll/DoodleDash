# 🎨 Doodle Dash — Draw, Guess, Laugh

A beautiful, real-time multiplayer drawing & guessing game. Create a room, invite friends, pick your brush, and doodle your way to victory.

**Made with ❤️ by ~Kushal**

🌐 [kushalneedsmcp.online](https://kushalneedsmcp.online)

---

## ✨ Features

- **Real-time multiplayer** (2–12 players) via WebSocket
- **5 brush types**: pen, marker, pencil, neon glow, eraser
- **Fill bucket + shapes** (line, rectangle, ellipse)
- **22-color palette** + custom color picker + 4 brush sizes
- **4 light themes**: Peach, Mint, Sky, Lavender (persisted)
- **Symmetry brush**: horizontal, vertical, 4-way kaleidoscope
- **Color-blind accessible** palette (deutan/protan/tritan) + high-contrast mode
- **ASMR brush sounds** (synthesized, toggleable)
- **5 paper textures**: plain, dots, grid, parchment, dark
- **Custom hand-drawn avatars** (128×128 mini-canvas, visible to all players)
- **Free cosmetics**: avatar frames, name colors, canvas borders
- **Player profile** with stats + drawings portfolio (local)
- **Spectator mode** (watch + react, can join mid-game)
- **Paint Studio** (solo free-paint mode with all tools)
- **Floating emoji reactions** on canvas
- **Replay gallery** (browse all drawings after game)
- **834 curated drawable words** (non-repeating per game)
- **4 word choices** for the drawer
- **No hints** during the game (only word-length dashes)
- **Pause on insufficient players** (drawer/guesser leaves → timer pauses)
- **Spectator promotion** (volunteer to fill a missing role)
- **Reconnect grace period** (20s to rejoin with same name)
- **PWA** (installable, standalone, mobile-friendly)
- **Synthesized sound effects** (Web Audio API, zero assets)
- **Confetti celebrations** at game-end + special arrivals

## 🎮 How to Play

1. **Create a room** (or join with a 5-character code)
2. Share the code with your friends
3. The host clicks **Start Game**
4. Each round, one player is the **drawer** — they pick from 4 words
5. The drawer draws while everyone else **guesses** in the chat
6. Correct guesses earn points based on speed
7. After all rounds, the player with the most points wins! 🏆

## 🔧 Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript** (strict)
- **Tailwind CSS 4** + **shadcn/ui**
- **Socket.io** (real-time multiplayer)
- **Prisma** + SQLite (local profile stats)
- **Framer Motion** (animations)
- **Zustand** (state management)
- **Web Audio API** (synthesized sound)
- **Inter** font (Claude-style clean sans)

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Start the Next.js dev server (port 3000)
bun run dev

# In a separate terminal, start the game WebSocket server (port 3003)
cd mini-services/game-server
bun install
bun run dev
```

Open `http://localhost:3000` and play!

## 🌐 Deployment

### Option 1: Vercel (Next.js) + Railway/Fly.io (WebSocket server)

1. **Frontend (Vercel)**:
   - Push to GitHub
   - Import to Vercel
   - Set `DATABASE_URL` env var (or use Vercel Postgres)
   - Deploy

2. **WebSocket server (Railway/Fly.io)**:
   - Deploy `mini-services/game-server/` as a separate service
   - Set the socket URL in the frontend (`io('/?XTransformPort=3003')` → your WS URL)

### Option 2: VPS (DigitalOcean / Hetzner / your own server)

1. Clone the repo
2. `bun install` in root + `mini-services/game-server/`
3. Use PM2 or systemd to run both:
   - `bun run dev` (Next.js on :3000)
   - `cd mini-services/game-server && bun run dev` (Socket.io on :3003)
4. Configure Nginx/Caddy to proxy:
   - `/` → localhost:3000
   - `/socket.io/?XTransformPort=3003` → localhost:3003

### Custom Domain (e.g. doodle.kushalneedsmcp.online)

1. Add an A record or CNAME in your DNS:
   ```
   doodle.kushalneedsmcp.online → your-server-IP
   ```
2. Configure your reverse proxy (Caddy/Nginx) for the subdomain
3. SSL via Let's Encrypt (automatic with Caddy)

**Caddyfile example:**
```
doodle.kushalneedsmcp.online {
    @transform_port_query {
        query XTransformPort=*
    }
    handle @transform_port_query {
        reverse_proxy localhost:{query.XTransformPort}
    }
    handle {
        reverse_proxy localhost:3000
    }
}
```

## 📁 Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── page.tsx         # Main view router
│   │   ├── layout.tsx       # Root layout (Inter font, themes)
│   │   ├── globals.css      # 4 themes + utilities
│   │   └── api/             # API routes
│   ├── components/game/     # All game components
│   │   ├── home/            # Home screen
│   │   ├── lobby/           # Waiting room
│   │   ├── play/            # Game screen (canvas, toolbar, chat, overlays)
│   │   └── paint/           # Paint Studio (solo mode)
│   ├── hooks/               # Socket hooks
│   └── lib/game/            # Store, types, words, sound, profile
├── mini-services/
│   └── game-server/         # Socket.io WebSocket server (port 3003)
├── prisma/                  # Database schema (PlayerStat)
├── public/                  # Logo, manifest
└── Caddyfile                # Gateway config
```

## 🔒 Privacy

- **No accounts, no login, no tracking**
- No personal data collected
- Game state is in-memory (not persisted)
- Profile stats stored locally in browser (localStorage)
- Read the full [Privacy Policy](file:///c:/Users/Default.L-HCG-9FVVGS3/OneDrive/Desktop/DoodleDash/src/app/privacy/page.tsx) page in-game.

## 📄 License & Community Policies

This project is licensed under the [MIT License](file:///c:/Users/Default.L-HCG-9FVVGS3/OneDrive/Desktop/DoodleDash/LICENSE).

For details on how to contribute and code guidelines, please refer to [CONTRIBUTING.md](file:///c:/Users/Default.L-HCG-9FVVGS3/OneDrive/Desktop/DoodleDash/CONTRIBUTING.md).

For reporting vulnerabilities, please read our [SECURITY.md](file:///c:/Users/Default.L-HCG-9FVVGS3/OneDrive/Desktop/DoodleDash/SECURITY.md) guidelines.

---

Made with ❤️ by **~Kushal** · [kushalneedsmcp.online](https://kushalneedsmcp.online)

