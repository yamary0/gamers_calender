import { NextResponse } from "next/server";

const message = {
  error: "Sessions endpoint moved. Use /api/guilds/:guildId/sessions/:sessionId instead.",
};

export async function PATCH() {
  return NextResponse.json(message, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json(message, { status: 410 });
}
