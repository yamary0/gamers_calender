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
import type { GuildNotificationSettings } from "@/services/guild-store";

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
  discordWebhookUrl?: unknown;
  notificationSettings?: unknown;
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

  const updates: {
    name?: string;
    slug?: string;
    webhookUrl?: string | null;
    notificationSettings?: {
      onSessionCreate: boolean;
      onSessionJoin: boolean;
      onSessionActivate: boolean;
      onSessionStart: boolean;
    };
  } = {};

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

  if (body.discordWebhookUrl !== undefined) {
    if (body.discordWebhookUrl !== null && typeof body.discordWebhookUrl !== "string") {
      return NextResponse.json(
        { error: "discordWebhookUrl must be a string or null." },
        { status: 422 },
      );
    }
    updates.webhookUrl =
      body.discordWebhookUrl === null
        ? null
        : (body.discordWebhookUrl as string).trim();
  }

  if (body.notificationSettings !== undefined) {
    if (!body.notificationSettings || typeof body.notificationSettings !== "object") {
      return NextResponse.json(
        { error: "notificationSettings must be an object." },
        { status: 422 },
      );
    }
    const settings = body.notificationSettings as Record<string, unknown>;
    const keys: Array<keyof GuildNotificationSettings> = [
      "onSessionCreate",
      "onSessionJoin",
      "onSessionActivate",
      "onSessionStart",
    ];

    for (const key of keys) {
      if (typeof settings[key] !== "boolean") {
        return NextResponse.json(
          { error: `notificationSettings.${key} must be boolean.` },
          { status: 422 },
        );
      }
    }

    updates.notificationSettings = {
      onSessionCreate: settings.onSessionCreate as boolean,
      onSessionJoin: settings.onSessionJoin as boolean,
      onSessionActivate: settings.onSessionActivate as boolean,
      onSessionStart: settings.onSessionStart as boolean,
    };
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
        : message.includes("slug must") || message.includes("name must") || message.includes("webhookUrl")
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
