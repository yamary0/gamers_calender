import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <header className="border-b">
            <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-6 py-4">
              <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Gamers Calendar
              </span>
              <span className="text-xs text-muted-foreground">
                Local MVP build
              </span>
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
      </body>
    </html>
  );
}
