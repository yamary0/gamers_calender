import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
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
  title: "Aligna",
  description: "気軽に集まりたいプレイヤー同士を結びつけるコミュニティハブ。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <GuildProvider>
            <div className="flex min-h-screen flex-col bg-[#0f1629] text-foreground">
              <header className="relative z-30 border-b border-[#1a2341] bg-[#1f273f]/80 text-foreground shadow-lg backdrop-blur">
                <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
                  <Link
                    href="/"
                    className="text-sm font-semibold uppercase tracking-wide text-foreground/80 transition hover:text-foreground"
                  >
                    Aligna
                  </Link>
                  <div className="flex items-center gap-3 rounded-full bg-[#111a2f]/60 px-3 py-2 backdrop-blur">
                    <GuildSwitcher />
                    <UserMenu />
                  </div>
                </div>
              </header>

              <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-10">
                <div className="pointer-events-none absolute inset-0 -z-10 rounded-[32px] border border-[#1a2341] bg-[#111a2f]/90 shadow-[0_30px_120px_-60px_rgba(88,101,242,0.8)] backdrop-blur-lg" />
                <div className="z-10 flex-1">
                  {children}
                </div>
              </main>

              <footer className="border-t border-[#1a2341] bg-[#070d19] text-slate-200">
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-1 px-6 py-4 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-foreground/70">
                    © {new Date().getFullYear()} Aligna.
                  </span>
                  <span className="text-foreground/50">
                    「誘われたら行きたい」を叶える仲間づくりプラットフォーム。
                  </span>
                </div>
              </footer>
            </div>
          </GuildProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
