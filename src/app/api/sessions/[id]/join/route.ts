import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { joinSession } from "@/services/session-store";
import { getUserFromRequest } from "@/lib/auth-server";

const extractAccessToken = (request: Request) => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to join sessions." },
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

    const session = await joinSession(id, user.id, accessToken);
    return NextResponse.json({ data: session });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Session not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      if (error.message === "Session is full") {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unable to join session" },
      { status: 500 },
    );
  }
}
