import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { joinSession } from "@/services/session-store";
import { getUserFromRequest } from "@/lib/auth-server";
import { sendDiscordNotification } from "@/lib/discord";

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

    const { session, activated } = await joinSession(id, user.id);

    if (activated) {
      await sendDiscordNotification({
        content: `✅ **Session Ready:** ${session.title} is now active (${session.participants.length}/${session.maxPlayers})`,
      });
    }

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
