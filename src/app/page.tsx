import { headers } from "next/headers";
import { ErrorToast } from "@/components/error-toast";
import { SessionsDashboard } from "@/components/sessions-dashboard";
import { listSessions } from "@/services/session-store";

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
  const sessions = listSessions();

  return (
    <main className="flex min-h-screen flex-col items-center bg-zinc-50 px-6 py-16 font-sans text-zinc-900">
      <div className="w-full max-w-3xl space-y-8">
        <section className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight">{APP_NAME}</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Gamers meetup scheduler prototype
          </p>

          <dl className="mt-8 space-y-4 text-sm">
            <div className="flex items-start justify-between gap-4 rounded-lg bg-zinc-100 px-4 py-3">
              <dt className="font-medium text-zinc-600">App version</dt>
              <dd className="font-mono text-zinc-900">{appVersion}</dd>
            </div>
            <div className="flex flex-col rounded-lg bg-zinc-100 px-4 py-3">
              <dt className="flex items-center justify-between text-zinc-600">
                <span className="font-medium">Ping status</span>
                <span className="font-semibold text-zinc-900">{pingStatus}</span>
              </dt>
              <dd className="mt-2 space-y-2">
                {pingErrorMessage && <ErrorToast message={pingErrorMessage} />}
                <div className="overflow-x-auto rounded bg-white px-3 py-2 font-mono text-xs text-zinc-800">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(ping, null, 2)}
                  </pre>
                </div>
              </dd>
            </div>
          </dl>
        </section>

        <SessionsDashboard initialSessions={sessions} />
      </div>
    </main>
  );
}
