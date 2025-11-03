import { NextResponse } from "next/server";

const message = {
  error: "Sessions endpoint moved. Use /api/guilds/:guildId/sessions instead.",
};

export async function GET() {
  return NextResponse.json(message, { status: 410 });
}

export async function POST() {
  return NextResponse.json(message, { status: 410 });
}
