import { NextResponse } from "next/server";
import { joinSession } from "@/services/session-store";

type RouteParams = {
  params: { id: string };
};

export function POST(_request: Request, { params }: RouteParams) {
  try {
    const session = joinSession(params.id);
    return NextResponse.json({ data: session });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Session not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      if (error.message === "Session is full") {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unable to join session" },
      { status: 500 },
    );
  }
}
