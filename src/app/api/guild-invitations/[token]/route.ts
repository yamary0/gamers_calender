import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-server";
import { acceptInvitation } from "@/services/guild-store";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getUserFromRequest(request);
  const { token } = await context.params;

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  try {
    const guild = await acceptInvitation(token, user.id);

    if (!guild) {
      return NextResponse.json(
        { error: "Invitation is invalid or already used." },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: guild });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to accept invitation",
      },
      { status: 500 },
    );
  }
}
