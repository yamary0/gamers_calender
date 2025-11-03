"use client";

import { SessionsDashboard } from "@/components/sessions-dashboard";
import { LandingPage } from "@/components/landing-page";
import { useAuth } from "@/components/auth-provider";

export type PingPayload =
  | { pong: true; timestamp?: string }
  | { pong: false; error: string };

type HomeScreenProps = {
  ping: PingPayload;
  appVersion: string;
};

export function HomeScreen({ ping, appVersion }: HomeScreenProps) {
  const { session } = useAuth();
  const isAuthenticated = Boolean(session);
  const pingErrorMessage = !ping.pong ? ping.error : null;

  return (
    <div className="w-full space-y-8">
      {isAuthenticated ? (
        <SessionsDashboard initialSessions={[]} />
      ) : (
        <LandingPage />
      )}

      <div className="border-t border-dashed border-border pt-4 text-xs text-muted-foreground">
        <p className="font-mono">Version {appVersion}</p>
        <p>
          Ping:{" "}
          {ping.pong ? (
            <>
              Reachable
              {ping.timestamp ? (
                <span className="text-muted-foreground">
                  {" "}
                  · {ping.timestamp}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-destructive">{pingErrorMessage}</span>
          )}
        </p>
      </div>
    </div>
  );
}
