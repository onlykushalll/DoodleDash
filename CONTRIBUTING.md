# Contributing to Doodle Dash

First off, thank you for taking the time to contribute! Doodle Dash is built to be a beautiful, fast, and fun multiplayer game, and we love community involvement.

By contributing to this project, you agree to abide by our Code of Conduct and standard open-source conventions.

---

## 🛠️ Local Development Setup

To set up Doodle Dash locally, you will need **Bun** installed on your machine.

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/onlykushalll/DoodleDash.git
cd DoodleDash

# Install main Next.js project dependencies
bun install

# Install game server dependencies
cd mini-services/game-server
bun install
cd ../..
```

### 2. Configure Environment

Copy the `.env.example` file to `.env` and adjust the variables if needed:
```bash
cp .env.example .env
```

By default, it uses a local SQLite database at `db/custom.db`.

### 3. Initialize Database

Push the Prisma database schema locally:
```bash
bun run db:push
```

### 4. Run the Development Servers

Start the Next.js development server (typically port 3000):
```bash
bun run dev
```

In a separate terminal, start the game server (port 3003):
```bash
cd mini-services/game-server
bun run dev
```

Open `http://localhost:3000` in your browser. Open multiple windows/tabs or private browsing sessions to test the multiplayer lobbies!

---

## 📐 Code Style Guidelines

- **TypeScript**: We write strict TypeScript. Avoid using `any` types. Ensure all events and payload interfaces conform to `src/lib/game/types.ts`.
- **Styling**: We use **Tailwind CSS v4** for layouts and components. Keep components responsive, accessible, and clean.
- **Linting**: Run `bun run lint` before committing your code to make sure it complies with ESLint configurations.
- **State Management**: Standard game state is stored in Zustand (`src/lib/game/store.ts`) and kept in sync with the Socket.io connection.

---

## 🚀 Pull Request Process

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-awesome-feature
   ```
2. Make your changes, keeping commits clean and descriptive.
3. Verify that the project builds and runs properly:
   ```bash
   bun run lint
   bun run build
   ```
4. Push your branch to your fork:
   ```bash
   git push origin feature/your-awesome-feature
   ```
5. Open a Pull Request against the `main` branch of the original repository.
6. Provide a description of your changes, how they were tested, and screenshots or screen recordings for any visual changes.

Thank you for making Doodle Dash better! 🎨✨
