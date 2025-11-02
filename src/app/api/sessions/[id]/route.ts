import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  deleteSession,
  updateSession,
  type UpdateSessionPayload,
} from "@/services/session-store";
import { getUserFromRequest } from "@/lib/auth-server";
import { sendDiscordNotification } from "@/lib/discord";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function validatePayload(payload: UpdateSessionPayload) {
  if (payload.title !== undefined && payload.title.trim().length < 3) {
    throw new Error("Title must be at least 3 characters long");
  }

  if (
    payload.maxPlayers !== undefined &&
    (!Number.isFinite(payload.maxPlayers) || payload.maxPlayers < 1)
  ) {
    throw new Error("maxPlayers must be a positive integer");
  }

  if (
    payload.status !== undefined &&
    payload.status !== "open" &&
    payload.status !== "active"
  ) {
    throw new Error("status must be either 'open' or 'active'");
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to update sessions." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as UpdateSessionPayload | null;

    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    try {
      validatePayload(body);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid payload" },
        { status: 422 },
      );
    }

    const sanitized: UpdateSessionPayload = {};

    if (body.title !== undefined) {
      sanitized.title = body.title.trim();
    }
    if (body.maxPlayers !== undefined) {
      sanitized.maxPlayers = Math.floor(body.maxPlayers);
    }
    if (body.status !== undefined) {
      sanitized.status = body.status;
    }

    const { session, activated } = await updateSession(id, sanitized);

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

      if (error.message === "Nothing to update.") {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unable to update session" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to delete sessions." },
        { status: 401 },
      );
    }

    const removed = await deleteSession(id);

    if (!removed) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: removed });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unable to delete session" },
      { status: 500 },
    );
  }
}
