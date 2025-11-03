import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import {
  deleteGuild,
  ensureGuildMembership,
  getGuildById,
  listGuildMembers,
  updateGuild,
} from "@/services/guild-store";

type RouteContext = {
  params: Promise<{ guildId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { guildId } = await context.params;

  const membership = await ensureGuildMembership(guildId, user.id);
  if (!membership) {
    return NextResponse.json(
      { error: "Guild membership required." },
      { status: 403 },
    );
  }

  try {
    const guild = await getGuildById(guildId);
    if (!guild) {
      return NextResponse.json({ error: "Guild not found." }, { status: 404 });
    }

    const members = await listGuildMembers(guildId);

    return NextResponse.json({
      data: {
        guild,
        membership,
        members,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load guild detail.",
      },
      { status: 500 },
    );
  }
}

type UpdateGuildBody = {
  name?: unknown;
  slug?: unknown;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { guildId } = await context.params;

  const membership = await ensureGuildMembership(guildId, user.id);
  if (!membership || membership.role !== "owner") {
    return NextResponse.json(
      { error: "Guild owner role required." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as UpdateGuildBody | null;
  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const updates: { name?: string; slug?: string } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string") {
      return NextResponse.json(
        { error: "name must be a string." },
        { status: 422 },
      );
    }
    updates.name = body.name;
  }

  if (body.slug !== undefined) {
    if (typeof body.slug !== "string") {
      return NextResponse.json(
        { error: "slug must be a string." },
        { status: 422 },
      );
    }
    updates.slug = body.slug;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Provide at least one field to update." },
      { status: 422 },
    );
  }

  try {
    const guild = await updateGuild(guildId, updates);
    const members = await listGuildMembers(guildId);

    return NextResponse.json({
      data: {
        guild,
        membership,
        members,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update guild.";
    const status =
      message === "Guild not found"
        ? 404
        : message.includes("slug must") || message.includes("name must")
          ? 422
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { guildId } = await context.params;

  const membership = await ensureGuildMembership(guildId, user.id);
  if (!membership || membership.role !== "owner") {
    return NextResponse.json(
      { error: "Guild owner role required." },
      { status: 403 },
    );
  }

  try {
    await deleteGuild(guildId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete guild.",
      },
      { status: 500 },
    );
  }
}
