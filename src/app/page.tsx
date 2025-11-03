import { headers } from "next/headers";
import { HomeScreen, type PingPayload } from "@/components/home-screen";

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
  return <HomeScreen ping={ping} appVersion={appVersion} />;
}
