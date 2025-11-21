"use client";

import { SessionsDashboard } from "@/components/sessions-dashboard";
import { LandingPage } from "@/components/landing-page";
import { useAuth } from "@/components/auth-provider";

export function HomeScreen() {
  const { session } = useAuth();
  const isAuthenticated = Boolean(session);

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
