import { getSupabaseServerClient } from "@/lib/supabase";

export type SessionStatus = "open" | "active";

export type Session = {
  id: string;
  title: string;
  maxPlayers: number;
  status: SessionStatus;
  participants: string[];
  createdAt: string;
};

export type CreateSessionPayload = {
  title: string;
  maxPlayers: number;
};

type SessionRow = {
  id: string;
  title: string;
  max_players: number;
  status: string;
  created_at: string;
  participants?: Array<{ user_id: string }>;
};

function mapStatus(value: string): SessionStatus {
  return value === "active" ? "active" : "open";
}

function mapRowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    title: row.title,
    maxPlayers: row.max_players,
    status: mapStatus(row.status),
    participants: row.participants?.map((participant) => participant.user_id) ?? [],
    createdAt: row.created_at,
  };
}

export async function listSessions(): Promise<Session[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("sessions")
    .select("id,title,max_players,status,created_at,participants(user_id)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list sessions: ${error.message}`);
  }

  return (data ?? []).map(mapRowToSession);
}

export async function createSession(
  payload: CreateSessionPayload,
): Promise<Session> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      title: payload.title,
      max_players: payload.maxPlayers,
      status: "open",
    })
    .select("id,title,max_players,status,created_at")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create session: ${error?.message ?? "unknown error"}`);
  }

  return mapRowToSession({ ...data, participants: [] });
}

export async function joinSession(id: string): Promise<Session> {
  const supabase = getSupabaseServerClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id,title,max_players,status,created_at,participants(user_id)")
    .eq("id", id)
    .maybeSingle();

  if (sessionError) {
    throw new Error(`Failed to load session: ${sessionError.message}`);
  }

  if (!session) {
    throw new Error("Session not found");
  }

  const participantIds = session.participants?.map((participant) => participant.user_id) ?? [];

  if (participantIds.length >= session.max_players || session.status === "active") {
    throw new Error("Session is full");
  }

  const newParticipantId = crypto.randomUUID();

  const { error: insertError } = await supabase
    .from("participants")
    .insert({
      session_id: id,
      user_id: newParticipantId,
    });

  if (insertError) {
    throw new Error(`Unable to join session: ${insertError.message}`);
  }

  if (participantIds.length + 1 >= session.max_players && session.status !== "active") {
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ status: "active" })
      .eq("id", id);

    if (updateError) {
      throw new Error(`Unable to update session status: ${updateError.message}`);
    }
  }

  const { data: updatedSession, error: refetchError } = await supabase
    .from("sessions")
    .select("id,title,max_players,status,created_at,participants(user_id)")
    .eq("id", id)
    .single();

  if (refetchError || !updatedSession) {
    throw new Error(`Failed to refresh session: ${refetchError?.message ?? "unknown error"}`);
  }

  return mapRowToSession(updatedSession);
}
