import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, Lock, Database, EyeOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Doodle Dash",
  description: "Learn how we protect your privacy at Doodle Dash. Standard production-grade privacy policy.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-border/60 bg-card p-6 shadow-soft sm:p-10">
        
        {/* Header */}
        <header className="mb-8 border-b border-border/60 pb-6 text-center sm:text-left">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-accent-soft hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Game
          </Link>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Privacy Policy</h1>
              <p className="text-xs text-muted-foreground mt-1">Last Updated: July 14, 2026</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-accent" />
              1. Zero Personal Data Collected
            </h2>
            <p>
              Doodle Dash is designed with a strict privacy-first principle. We do <b>not</b> require you to create an account, register, or log in to play.
              We do <b>not</b> collect, store, or sell any personal data such as your name, email address, password, or IP address.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Database className="h-4 w-4 text-accent" />
              2. In-Memory Session Data
            </h2>
            <p>
              When you create or join a game room, all game-related data (including your temporary nickname, selected avatar emoji, drawing strokes, guesses, and score) is processed entirely <b>in-memory</b> on our server.
              This data exists solely for the duration of your game session. Once the room becomes inactive or is closed, this session data is permanently deleted from the server's memory.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-accent" />
              3. Browser Local Storage
            </h2>
            <p>
              Doodle Dash uses standard browser <code>localStorage</code> to improve your experience. This is stored locally on your device and is never sent to our servers except to authenticate your socket session. We store:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Your local player stats (games played, win rates, historical drawing portfolio).</li>
              <li>Your earned avatar cosmetic frames and customizable settings.</li>
              <li>Your light/dark theme preference (Peach, Mint, Sky, or Lavender).</li>
            </ul>
            <p>
              You can clear this data at any time by clearing your browser's site data or cookies for this website.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">4. Web Audio API and Synthesized Sounds</h2>
            <p>
              All brush drawing sounds, UI click sounds, and celebration triggers are synthesized in real-time on your device using the browser's native **Web Audio API**. We do not stream audio assets or use tracking scripts to monitor sound settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">5. Children&apos;s Privacy (COPPA &amp; GDPR)</h2>
            <p>
              Doodle Dash does not knowingly collect any personal information from children under 13.
              We do not require accounts, email addresses, or any identifiable information. No child&apos;s data is tracked, logged, or processed beyond the immediate gameplay session.
              If you believe a child under 13 has provided personal information, please contact us
              and we will delete it immediately. Parents may request deletion of any locally-stored
              data by clearing the browser&apos;s localStorage or clicking &quot;Delete all my local data&quot; inside the About dialog.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">6. Policy Changes</h2>
            <p>
              We reserve the right to update this policy as new gameplay features are developed. Any modifications will be updated on this page. By continuing to use Doodle Dash, you agree to the conditions listed in this privacy policy.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-border/60 text-center sm:text-left">
            <h2 className="text-sm font-bold text-foreground">Questions?</h2>
            <p className="text-xs">
              If you have any questions or feedback about our privacy practices, you can contact Kushal via the links on the main page.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
