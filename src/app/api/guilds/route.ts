import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import {
  createGuild,
  listGuildsForUser,
} from "@/services/guild-store";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ data: [] });
  }

  try {
    const guilds = await listGuildsForUser(user.id);
    return NextResponse.json({ data: guilds });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list guilds",
      },
      { status: 500 },
    );
  }
}

type CreateGuildBody = {
  name?: unknown;
};

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as CreateGuildBody | null;

  if (!body || typeof body.name !== "string") {
    return NextResponse.json(
      { error: "name is required." },
      { status: 422 },
    );
  }

  const name = body.name.trim();

  if (name.length < 3) {
    return NextResponse.json(
      { error: "name must be at least 3 characters." },
      { status: 422 },
    );
  }

  try {
    const guild = await createGuild(name, user.id);
    return NextResponse.json({ data: guild }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create guild",
      },
      { status: 500 },
    );
  }
}
