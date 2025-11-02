import { NextResponse } from "next/server";
import {
  createSession,
  listSessions,
  type CreateSessionPayload,
} from "@/services/session-store";
import { getUserFromRequest } from "@/lib/auth-server";

const extractAccessToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function GET(request: Request) {
  try {
    const accessToken = extractAccessToken(request) ?? undefined;
    const sessions = await listSessions(accessToken);
    return NextResponse.json({ data: sessions });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load sessions",
      },
      { status: 500 },
    );
  }
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

  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to create sessions." },
        { status: 401 },
      );
    }

    const accessToken = extractAccessToken(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing bearer token." },
        { status: 401 },
      );
    }

    const session = await createSession(
      {
        title,
        maxPlayers,
      },
      user.id,
      accessToken,
    );

    return NextResponse.json({ data: session }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create session",
      },
      { status: 500 },
    );
  }
}
