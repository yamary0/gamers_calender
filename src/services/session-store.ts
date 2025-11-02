import { getSupabaseServiceClient } from "@/lib/supabase";

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

function admin() {
  return getSupabaseServiceClient();
}

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

async function fetchSessionById(id: string) {
  const supabase = admin();
  const { data, error } = await supabase
    .from("sessions")
    .select("id,title,max_players,status,created_at,participants(user_id)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load session: ${error.message}`);
  }

  return data ?? null;
}

export async function listSessions(): Promise<Session[]> {
  const supabase = admin();

  const { data, error } = await supabase
    .from("sessions")
    .select("id,title,max_players,status,created_at,participants(user_id)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list sessions: ${error.message}`);
  }

  return (data ?? []).map(mapRowToSession);
}

export type CreateSessionResult = {
  session: Session;
  activated: boolean;
};

export async function createSession(
  payload: CreateSessionPayload,
  userId: string,
): Promise<CreateSessionResult> {
  const supabase = admin();

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

  const insertParticipant = await supabase
    .from("participants")
    .upsert(
      {
        session_id: data.id,
        user_id: userId,
      },
      { onConflict: "session_id,user_id" },
    );

  if (insertParticipant.error) {
    throw new Error(`Failed to add session owner: ${insertParticipant.error.message}`);
  }

  const { count } = await supabase
    .from("participants")
    .select("user_id", { count: "exact", head: true })
    .eq("session_id", data.id);

  const shouldActivate =
    (count ?? 0) >= payload.maxPlayers && data.status !== "active";

  if (shouldActivate) {
    await supabase.from("sessions").update({ status: "active" }).eq("id", data.id);
  }

  const withParticipants = await fetchSessionById(data.id);

  if (!withParticipants) {
    throw new Error("Failed to reload session after creation.");
  }

  return {
    session: mapRowToSession(withParticipants),
    activated: shouldActivate,
  };
}

export type JoinSessionResult = {
  session: Session;
  activated: boolean;
};

export async function joinSession(
  id: string,
  userId: string,
): Promise<JoinSessionResult> {
  const supabase = admin();
  const session = await fetchSessionById(id);

  if (!session) {
    throw new Error("Session not found");
  }

  const { data: existing } = await supabase
    .from("participants")
    .select("user_id")
    .eq("session_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return { session: mapRowToSession(session), activated: false };
  }

  const { count: currentCount } = await supabase
    .from("participants")
    .select("user_id", { count: "exact", head: true })
    .eq("session_id", id);

  if ((currentCount ?? 0) >= session.max_players || session.status === "active") {
    throw new Error("Session is full");
  }

  const nextCount = (currentCount ?? 0) + 1;
  const shouldActivate =
    session.status !== "active" && nextCount >= session.max_players;

  const { error: insertError } = await supabase.from("participants").insert({
    session_id: id,
    user_id: userId,
  });

  if (insertError) {
    throw new Error(`Unable to join session: ${insertError.message}`);
  }

  if (shouldActivate) {
    await supabase.from("sessions").update({ status: "active" }).eq("id", id);
  }

  const updatedSession = await fetchSessionById(id);

  if (!updatedSession) {
    throw new Error("Failed to reload session after join.");
  }

  return { session: mapRowToSession(updatedSession), activated: shouldActivate };
}
