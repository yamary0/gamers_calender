import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import {
  getGuildById,
  joinGuild,
} from "@/services/guild-store";

type RouteContext = {
  params: Promise<{ guildId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { guildId } = await context.params;

  try {
    const guild = await getGuildById(guildId);
    if (!guild) {
      return NextResponse.json({ error: "Guild not found." }, { status: 404 });
    }

    const membership = await joinGuild(guildId, user.id);

    return NextResponse.json({
      data: {
        guild: {
          id: guild.id,
          name: guild.name,
          slug: guild.slug,
        },
        membership,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to join guild.";
    return NextResponse.json(
      {
        error: message,
      },
      { status: message === "Guild not found" ? 404 : 500 },
    );
  }
}
