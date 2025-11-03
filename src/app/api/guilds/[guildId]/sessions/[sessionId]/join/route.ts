import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { ensureGuildMembership } from "@/services/guild-store";
import { joinSession, getSession } from "@/services/session-store";
import { sendDiscordNotification } from "@/lib/discord";

type RouteContext = {
  params: Promise<{ guildId: string; sessionId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getUserFromRequest(request);
  const { guildId, sessionId } = await context.params;

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required to join sessions." },
      { status: 401 },
    );
  }

  const membership = await ensureGuildMembership(guildId, user.id);
  if (!membership) {
    return NextResponse.json(
      { error: "Guild membership required." },
      { status: 403 },
    );
  }

  const session = await getSession(sessionId);
  if (!session || session.guildId !== guildId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    const result = await joinSession(sessionId, user.id, guildId);
    if (result.activated) {
      await sendDiscordNotification({
        content: `✅ **Session Ready:** ${result.session.title} is now active (${result.session.participants.length}/${result.session.maxPlayers})`,
      });
    }
    return NextResponse.json({ data: result.session });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Session not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === "Session is full") {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message === "Session does not belong to this guild") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unable to join session" },
      { status: 500 },
    );
  }
}
