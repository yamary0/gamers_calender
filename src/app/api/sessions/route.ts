import { NextResponse } from "next/server";
import {
  createSession,
  listSessions,
  type CreateSessionPayload,
} from "@/services/session-store";

export function GET() {
  return NextResponse.json({ data: listSessions() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<CreateSessionPayload> | null;

  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const maxPlayers =
    typeof body.maxPlayers === "number" ? Math.floor(body.maxPlayers) : NaN;

  if (title.length < 3) {
    return NextResponse.json(
      { error: "Title must be at least 3 characters long" },
      { status: 422 },
    );
  }

  if (!Number.isFinite(maxPlayers) || maxPlayers < 1) {
    return NextResponse.json(
      { error: "maxPlayers must be a positive integer" },
      { status: 422 },
    );
  }

  const session = createSession({
    title,
    maxPlayers,
  });

  return NextResponse.json({ data: session }, { status: 201 });
}
