import { NextResponse } from "next/server";

const message = {
  error: "Sessions endpoint moved. Use /api/guilds/:guildId/sessions/:sessionId/join instead.",
};

export async function POST() {
  return NextResponse.json(message, { status: 410 });
}
