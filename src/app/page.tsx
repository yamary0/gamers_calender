import { headers } from "next/headers";
import { ErrorToast } from "@/components/error-toast";
import { SessionsDashboard } from "@/components/sessions-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listSessions, type Session } from "@/services/session-store";

const APP_NAME = "Gamers Calendar";

type PingPayload =
  | { pong: true; timestamp?: string }
  | { pong: false; error: string };

async function fetchPing(): Promise<PingPayload> {
  const incomingHeaders = await headers();
  const host = incomingHeaders.get("host");
  const forwardedProto = incomingHeaders.get("x-forwarded-proto");
  const protocol =
    forwardedProto ??
    (process.env.NODE_ENV === "development" ? "http" : "https");
  const baseUrl = host ? `${protocol}://${host}` : "";

  try {
    const response = await fetch(`${baseUrl}/api/ping`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return { pong: false, error: `HTTP ${response.status}` };
    }

    const payload = (await response.json()) as {
      pong: boolean;
      timestamp?: string;
    };

    if (payload.pong) {
      return { pong: true, timestamp: payload.timestamp };
    }

    return { pong: false, error: "Unexpected response shape" };
  } catch (error) {
    return {
      pong: false,
      error: error instanceof Error ? error.message : "Ping failed",
    };
  }
}

export default async function Home() {
  const ping = await fetchPing();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
  const pingStatus = ping.pong ? "Reachable" : "Unreachable";
  const pingErrorMessage = !ping.pong ? ping.error : null;
  let sessionsError: string | null = null;
  let sessions: Session[] = [];

  try {
    sessions = await listSessions();
  } catch (error) {
    sessionsError =
      error instanceof Error ? error.message : "Failed to load sessions";
  }

  return (
    <div className="w-full space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-semibold tracking-tight">
            {APP_NAME}
          </CardTitle>
          <CardDescription>
            Gamers meetup scheduler prototype
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
            <span className="font-medium text-muted-foreground">App version</span>
            <span className="font-mono text-sm">{appVersion}</span>
          </div>
          <div className="space-y-2 rounded-lg border bg-muted/40 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-muted-foreground">Ping status</span>
              <span className="font-semibold">{pingStatus}</span>
            </div>
            {pingErrorMessage && <ErrorToast message={pingErrorMessage} />}
            <div className="overflow-x-auto rounded-md bg-background px-3 py-2 font-mono text-xs">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(ping, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {sessionsError && (
        <ErrorToast message={`Sessions unavailable: ${sessionsError}`} />
      )}

      <SessionsDashboard initialSessions={sessions} />
    </div>
  );
}
