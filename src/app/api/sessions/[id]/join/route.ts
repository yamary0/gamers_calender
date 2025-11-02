import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { joinSession } from "@/services/session-store";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const session = joinSession(id);
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
