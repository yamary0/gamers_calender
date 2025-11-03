import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import {
  ensureGuildMembership,
  getGuildById,
  getGuildBySlug,
} from "@/services/guild-store";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const guildId = url.searchParams.get("guildId") ?? url.searchParams.get("id");
  const slug = url.searchParams.get("slug");

  if (!guildId && !slug) {
    return NextResponse.json(
      { error: "Provide either guildId or slug query parameter." },
      { status: 400 },
    );
  }

  try {
    const guild = guildId
      ? await getGuildById(guildId)
      : slug
        ? await getGuildBySlug(slug)
        : null;
    if (!guild) {
      return NextResponse.json({ error: "Guild not found." }, { status: 404 });
    }

    const membership = await ensureGuildMembership(guild.id, user.id);

    return NextResponse.json({
      data: {
        guild: {
          id: guild.id,
          name: guild.name,
          slug: guild.slug,
        },
        alreadyMember: Boolean(membership),
        role: membership?.role ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to search for guild.",
      },
      { status: 500 },
    );
  }
}
