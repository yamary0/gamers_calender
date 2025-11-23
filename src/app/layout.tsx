import type { Metadata } from "next";
import { Geist, Geist_Mono, Jersey_10 } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/components/auth-provider";
import { GuildProvider } from "@/components/guild-provider";
import { GuildSwitcher } from "@/components/guild-switcher";
import { UserMenu } from "@/components/user-menu";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import FooterYear from "@/components/footer-year";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jersey = Jersey_10({
  variable: "--font-jersey",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aligna",
  description: "気軽に集まりたいプレイヤー同士を結びつけるコミュニティハブ。",
  icons: {
    icon: "/aligna_icon.svg",
    apple: "/aligna_icon.png",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

import { BottomNav } from "@/components/bottom-nav";

// ... imports

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jersey.variable} antialiased`}
      >
        <AuthProvider>
          <GuildProvider>
            <div className="flex min-h-screen flex-col bg-background text-foreground">
              {/* Desktop Header with enhanced glassmorphism */}
              <header className="relative z-30 hidden border-b border-border/50 bg-card/80 text-foreground shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 md:block">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/10 to-transparent" />
                <div className="relative mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
                  <Link
                    href="/"
                    className="group flex items-center gap-3 text-sm font-semibold uppercase tracking-wide text-foreground/80 transition hover:text-foreground"
                  >
                    <Image src="/aligna_icon_positive.svg" alt="Aligna" width={48} height={48} />
                    <span
                      className={`${jersey.className} text-xl font-bold tracking-[0.18em] text-foreground transition-colors group-hover:text-primary`}
                    >
                      ALIGNA
                    </span>
                  </Link>
                  <div className="flex items-center gap-3">
                    <GuildSwitcher />
                    <UserMenu />
                  </div>
                </div>
              </header>

              {/* Mobile Header (Simple Logo) */}
              <header className="sticky top-0 z-30 border-b border-border/50 bg-card/80 text-foreground shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 md:hidden">
                <div className="flex h-14 items-center justify-center px-4">
                  <Link
                    href="/"
                    className="group flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground/80 transition hover:text-foreground"
                  >
                    <Image src="/aligna_icon_positive.svg" alt="Aligna" width={36} height={36} />
                    <span
                      className={`${jersey.className} text-lg font-bold tracking-[0.18em] text-foreground transition-colors group-hover:text-primary`}
                    >
                      ALIGNA
                    </span>
                  </Link>
                </div>
              </header>

              <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 pb-24 md:px-6 md:py-10 md:pb-10">
                <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl border border-border/50 bg-card/40 shadow-[0_20px_80px_-40px_rgba(88,101,242,0.3)] backdrop-blur-sm" />
                <div className="z-10 flex-1">
                  {children}
                </div>
              </main>

              <BottomNav />

              <footer className="hidden border-t border-border/50 bg-card/60 text-slate-200 backdrop-blur-sm md:block">
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-foreground/70">
                      © <FooterYear /> Aligna.
                    </span>
                    <span className="text-foreground/50">
                      「誘われたら行きたい」を叶える仲間づくりプラットフォーム。
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <Button asChild variant="outline" size="lg">
                      <Link href="/landing">戻る</Link>
                    </Button>
                  </div>
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
