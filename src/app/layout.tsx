import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/game/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Doodle Dash — Draw, Guess, Laugh",
  description:
    "A beautiful multiplayer drawing & guessing game. Create a room, invite friends, pick your brush, and doodle your way to victory.",
  keywords: ["drawing game", "pictionary", "multiplayer", "skribbl", "draw and guess", "doodle"],
  authors: [{ name: "Doodle Dash" }],
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Doodle Dash" },
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/logo.svg" }],
  },
  openGraph: {
    title: "Doodle Dash — Draw, Guess, Laugh",
    description: "A beautiful multiplayer drawing & guessing game.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fff8f3" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider>
          {children}
          <Toaster />
          <SonnerToaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
