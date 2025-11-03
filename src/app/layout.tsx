import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { AuthProvider } from "@/components/auth-provider";
import { GuildProvider } from "@/components/guild-provider";
import { GuildSwitcher } from "@/components/guild-switcher";
import { UserMenu } from "@/components/user-menu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gamers Calendar",
  description: "Coordinate multiplayer sessions without friction.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <GuildProvider>
            <div className="flex min-h-screen flex-col bg-background text-foreground">
              <header className="border-b">
                <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
                  <Link
                    href="/"
                    className="text-sm font-semibold uppercase tracking-wide text-muted-foreground transition hover:text-foreground"
                  >
                    Gamers Calendar
                  </Link>
                  <div className="flex items-center gap-3">
                    <GuildSwitcher />
                    <UserMenu />
                  </div>
                </div>
              </header>

              <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-10">
                {children}
              </main>

              <footer className="border-t">
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-1 px-6 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span>© {new Date().getFullYear()} Gamers Calendar.</span>
                  <span>Phase-based local development build.</span>
                </div>
              </footer>
            </div>
          </GuildProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
