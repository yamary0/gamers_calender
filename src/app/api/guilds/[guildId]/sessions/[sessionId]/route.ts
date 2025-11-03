import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parseISO, isValid as isValidDate } from "date-fns";
import {
  deleteSession,
  getSession,
  updateSession,
  type SessionSchedule,
} from "@/services/session-store";
import { ensureGuildMembership, getGuildById } from "@/services/guild-store";
import { getUserFromRequest } from "@/lib/auth-server";
import { sendDiscordNotification } from "@/lib/discord";
import { buildSessionUrl, resolveBaseUrl } from "@/lib/url";
import {
  scheduleSessionStartNotification,
  cancelSessionStartNotification,
} from "@/lib/session-notifier";

type RouteContext = {
  params: Promise<{ guildId: string; sessionId: string }>;
};

type UpdateSessionBody = {
  title?: unknown;
  maxPlayers?: unknown;
  status?: unknown;
  schedule?: unknown;
};

const parseSchedule = (value: unknown): SessionSchedule => {
  if (!value || typeof value !== "object") {
    return { kind: "none" };
  }

  const schedule = value as Record<string, unknown>;
  const kind = schedule.kind;

  if (kind === "all-day") {
    const date = schedule.date;
    if (typeof date !== "string") {
      throw new Error("schedule.date must be provided for all-day sessions");
    }
    const parsed = parseISO(date);
    if (!isValidDate(parsed)) {
      throw new Error("schedule.date must be a valid ISO date");
    }
    return { kind: "all-day", date: parsed.toISOString() };
  }

  if (kind === "timed") {
    const startAt = schedule.startAt;
    const endAt = schedule.endAt;

    if (typeof startAt !== "string") {
      throw new Error("schedule.startAt must be provided for timed sessions");
    }
    const parsedStart = parseISO(startAt);
    if (!isValidDate(parsedStart)) {
      throw new Error("schedule.startAt must be a valid ISO datetime");
    }

    let parsedEnd: Date | null = null;
    if (endAt !== undefined && endAt !== null) {
      if (typeof endAt !== "string") {
        throw new Error("schedule.endAt must be a string when provided");
      }
      parsedEnd = parseISO(endAt);
      if (!isValidDate(parsedEnd)) {
        throw new Error("schedule.endAt must be a valid ISO datetime");
      }
      if (parsedEnd <= parsedStart) {
        throw new Error("schedule.endAt must be after schedule.startAt");
      }
    }

    return {
      kind: "timed",
      startAt: parsedStart.toISOString(),
      endAt: parsedEnd ? parsedEnd.toISOString() : null,
    };
  }

  return { kind: "none" };
};

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getUserFromRequest(request);
  const { guildId, sessionId } = await context.params;

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const membership = await ensureGuildMembership(guildId, user.id);
  if (!membership) {
    return NextResponse.json({ error: "Guild membership required." }, { status: 403 });
  }

  const session = await getSession(sessionId);

  if (!session || session.guildId !== guildId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ data: session });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getUserFromRequest(request);
  const { guildId, sessionId } = await context.params;

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required to update sessions." },
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

  const body = (await request.json().catch(() => null)) as UpdateSessionBody | null;

  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const updates: Parameters<typeof updateSession>[1] = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length < 3) {
      return NextResponse.json(
        { error: "title must be at least 3 characters long" },
        { status: 422 },
      );
    }
    updates.title = body.title.trim();
  }

  if (body.maxPlayers !== undefined) {
    if (
      typeof body.maxPlayers !== "number" ||
      !Number.isFinite(body.maxPlayers) ||
      body.maxPlayers < 1
    ) {
      return NextResponse.json(
        { error: "maxPlayers must be a positive integer" },
        { status: 422 },
      );
    }
    updates.maxPlayers = Math.floor(body.maxPlayers);
  }

  if (body.status !== undefined) {
    if (body.status !== "open" && body.status !== "active") {
      return NextResponse.json(
        { error: "status must be either 'open' or 'active'" },
        { status: 422 },
      );
    }
    updates.status = body.status;
  }

  if (body.schedule !== undefined) {
    try {
      updates.schedule = parseSchedule(body.schedule);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Invalid schedule payload",
        },
        { status: 422 },
      );
    }
  }

  try {
    const guild = await getGuildById(guildId);
    if (!guild) {
      return NextResponse.json({ error: "Guild not found." }, { status: 404 });
    }

    const result = await updateSession(sessionId, updates, guildId);

    const baseUrl = resolveBaseUrl(request);
    const sessionUrl = buildSessionUrl(baseUrl, guild.slug, result.session.id);
    const formatMessage = (message: string) =>
      sessionUrl ? `${message}\n🔗 ${sessionUrl}` : message;

    if (result.activated && guild.notificationSettings.onSessionActivate && guild.webhookUrl) {
      await sendDiscordNotification(
        {
          content: formatMessage(
            `✅ **Session ready:** ${result.session.title} is now active (${result.session.participants.length}/${result.session.maxPlayers}).`,
          ),
        },
        guild.webhookUrl,
      );
    }

    scheduleSessionStartNotification({
      guildId,
      session: result.session,
      webhookUrl: guild.webhookUrl,
      settings: guild.notificationSettings,
      sessionUrl,
    });

    return NextResponse.json({ data: result.session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update session";
    const status =
      message === "Session does not belong to this guild"
        ? 403
        : message === "Session not found"
          ? 404
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getUserFromRequest(request);
  const { guildId, sessionId } = await context.params;

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required to delete sessions." },
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

  try {
    cancelSessionStartNotification({ guildId, sessionId });

    const removed = await deleteSession(sessionId, guildId);

    if (!removed) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ data: removed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete session";
    const status = message === "Session does not belong to this guild" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
