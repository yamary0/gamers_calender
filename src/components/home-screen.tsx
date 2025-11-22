"use client";

import { SessionsDashboard } from "@/components/sessions-dashboard";
import { LandingPage } from "@/components/landing-page";
import { useAuth } from "@/components/auth-provider";

export function HomeScreen() {
  const { session, loading } = useAuth();
  const isAuthenticated = Boolean(session);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
        <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-muted/60" />
        <div className="h-32 w-full animate-pulse rounded bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {isAuthenticated ? (
        <SessionsDashboard initialSessions={[]} />
      ) : (
        <LandingPage />
      )}
    </div>
  );
}
