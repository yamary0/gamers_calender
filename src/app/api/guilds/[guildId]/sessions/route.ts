import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parseISO, isValid as isValidDate } from "date-fns";
import { getUserFromRequest } from "@/lib/auth-server";
import { sendDiscordNotification } from "@/lib/discord";
import { buildSessionUrl, resolveBaseUrl } from "@/lib/url";
import { scheduleSessionStartNotification } from "@/lib/session-notifier";
import { getGuildById } from "@/services/guild-store";
import {
  createSession,
  listSessions,
  type SessionSchedule,
} from "@/services/session-store";
import { ensureGuildMembership } from "@/services/guild-store";

type RouteContext = {
  params: Promise<{ guildId: string }>;
};

type CreateSessionBody = {
  title?: unknown;
  maxPlayers?: unknown;
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
  const { guildId } = await context.params;

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const membership = await ensureGuildMembership(guildId, user.id);
  if (!membership) {
    return NextResponse.json({ error: "Guild membership required." }, { status: 403 });
  }

  try {
    const sessions = await listSessions(guildId);
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

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getUserFromRequest(request);
  const { guildId } = await context.params;

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const membership = await ensureGuildMembership(guildId, user.id);
  if (!membership) {
    return NextResponse.json({ error: "Guild membership required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as CreateSessionBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
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

  let schedule: SessionSchedule;
  try {
    schedule = parseSchedule(body.schedule);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid schedule payload",
      },
      { status: 422 },
    );
  }

  try {
    const guild = await getGuildById(guildId);
    if (!guild) {
      return NextResponse.json({ error: "Guild not found." }, { status: 404 });
    }

    const creatorName =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      user.email ??
      user.id;

    const result = await createSession(
      {
        title,
        maxPlayers,
        schedule,
      },
      user.id,
      guildId,
    );

    const baseUrl = resolveBaseUrl(request);
    const sessionUrl = buildSessionUrl(baseUrl, guild.slug, result.session.id);
    const formatMessage = (message: string) =>
      sessionUrl ? `${message}\n🔗 ${sessionUrl}` : message;

    if (guild.notificationSettings.onSessionCreate && guild.webhookUrl) {
      await sendDiscordNotification(
        {
          content: formatMessage(
            `🆕 **New session:** ${result.session.title} (${result.session.participants.length}/${result.session.maxPlayers}) created by ${creatorName}.`,
          ),
        },
        guild.webhookUrl,
      );
    }

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

    return NextResponse.json({ data: result.session }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create session",
      },
      { status: 500 },
    );
  }
}
