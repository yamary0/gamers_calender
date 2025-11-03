import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { createGuildInvitation, ensureGuildMembership } from "@/services/guild-store";

type RouteContext = {
  params: Promise<{ guildId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getUserFromRequest(request);
  const { guildId } = await context.params;

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
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
    const token = await createGuildInvitation(guildId, user.id);
    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const base = origin.replace(/\/$/, "");
    const url = `${base}/guild-invite/${token}`;
    return NextResponse.json({ data: { token, url } }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create invitation",
      },
      { status: 500 },
    );
  }
}
