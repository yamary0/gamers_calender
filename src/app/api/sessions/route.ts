import { NextResponse } from "next/server";
import { parseISO, isValid as isValidDate } from "date-fns";
import {
  createSession,
  listSessions,
  type SessionSchedule,
} from "@/services/session-store";
import { getUserFromRequest } from "@/lib/auth-server";
import { sendDiscordNotification } from "@/lib/discord";

type CreateRequestBody = {
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

export async function GET() {
  try {
    const sessions = await listSessions();
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
  const body = (await request.json().catch(() => null)) as CreateRequestBody | null;

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
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to create sessions." },
        { status: 401 },
      );
    }

    const { session, activated } = await createSession(
      {
        title,
        maxPlayers,
        schedule,
      },
      user.id,
    );

    if (activated) {
      await sendDiscordNotification({
        content: `✅ **Session Ready:** ${session.title} is now active (${session.participants.length}/${session.maxPlayers})`,
      });
    }

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
