import { headers } from "next/headers";
import { SessionsDashboard } from "@/components/sessions-dashboard";

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
  const pingErrorMessage = !ping.pong ? ping.error : null;

  return (
    <div className="w-full space-y-8">

      <SessionsDashboard initialSessions={[]} />

      <div className="border-t border-dashed border-border pt-4 text-xs text-muted-foreground">
        <p className="font-mono">
          Version {appVersion}
        </p>
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
