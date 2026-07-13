import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Doodle Dash",
  description: "Terms of Service for using Doodle Dash.",
};

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
            Doodle Dash is provided &quot;as is&quot; without warranty of any kind. We do not guarantee
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
          <h2 className="text-xl font-bold">5. Children&apos;s Privacy</h2>
          <p className="text-sm text-muted-foreground">
            Doodle Dash is suitable for all ages. We do not collect personal information from anyone,
            including children under 13. No accounts are required to play.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">6. Privacy</h2>
          <p className="text-sm text-muted-foreground">
            We collect no personal data. See our <a href="/privacy" className="underline">Privacy Policy</a>.
          </p>
        </section>

        <p className="pt-6 text-sm font-semibold">Made with ❤️ by ~Kushal</p>
      </div>
    </div>
  );
}
