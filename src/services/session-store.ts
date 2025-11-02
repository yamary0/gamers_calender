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

export type UpdateSessionPayload = Partial<{
  title: string;
  maxPlayers: number;
  status: SessionStatus;
}>;

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

async function fetchSessionById(id: string): Promise<SessionRow | null> {
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

async function participantCount(sessionId: string): Promise<number> {
  const supabase = admin();
  const { count, error } = await supabase
    .from("participants")
    .select("user_id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (error) {
    throw new Error(`Failed to count participants: ${error.message}`);
  }

  return count ?? 0;
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

export type SessionMutationResult = {
  session: Session;
  activated: boolean;
};

export async function createSession(
  payload: CreateSessionPayload,
  userId: string,
): Promise<SessionMutationResult> {
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

  const { error: ownerError } = await supabase
    .from("participants")
    .upsert(
      {
        session_id: data.id,
        user_id: userId,
      },
      { onConflict: "session_id,user_id" },
    );

  if (ownerError) {
    throw new Error(`Failed to add session owner: ${ownerError.message}`);
  }

  const count = await participantCount(data.id);
  const shouldActivate = count >= payload.maxPlayers && data.status !== "active";

  if (shouldActivate) {
    await supabase.from("sessions").update({ status: "active" }).eq("id", data.id);
  }

  const refreshed = await fetchSessionById(data.id);

  if (!refreshed) {
    throw new Error("Failed to reload session after creation.");
  }

  return {
    session: mapRowToSession(refreshed),
    activated: shouldActivate,
  };
}

export async function updateSession(
  id: string,
  payload: UpdateSessionPayload,
): Promise<SessionMutationResult> {
  if (!payload.title && payload.maxPlayers === undefined && payload.status === undefined) {
    throw new Error("Nothing to update.");
  }

  const supabase = admin();
  const existing = await fetchSessionById(id);

  if (!existing) {
    throw new Error("Session not found");
  }

  const updates: Record<string, unknown> = {};

  if (payload.title !== undefined) {
    updates.title = payload.title;
  }
  if (payload.maxPlayers !== undefined) {
    updates.max_players = payload.maxPlayers;
  }
  if (payload.status !== undefined) {
    updates.status = payload.status;
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from("sessions")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      throw new Error(`Failed to update session: ${updateError.message}`);
    }
  }

  let refreshed = await fetchSessionById(id);

  if (!refreshed) {
    throw new Error("Failed to reload session after update.");
  }

  const maxPlayers = refreshed.max_players;
  const count = await participantCount(id);

  const shouldActivate =
    count >= maxPlayers && refreshed.status !== "active";

  if (shouldActivate) {
    const { error: statusError } = await supabase
      .from("sessions")
      .update({ status: "active" })
      .eq("id", id);

    if (statusError) {
      throw new Error(`Failed to activate session: ${statusError.message}`);
    }

    refreshed = await fetchSessionById(id);

    if (!refreshed) {
      throw new Error("Failed to reload session after activation.");
    }
  } else if (
    payload.status === "open" &&
    refreshed.status === "open" &&
    count < maxPlayers &&
    existing.status === "active"
  ) {
    // Deactivation requested explicitly and allowed because there is room.
  }

  return {
    session: mapRowToSession(refreshed),
    activated: existing.status !== "active" && refreshed.status === "active",
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

  const count = await participantCount(id);

  if (count >= session.max_players || session.status === "active") {
    throw new Error("Session is full");
  }

  const { error: insertError } = await supabase.from("participants").insert({
    session_id: id,
    user_id: userId,
  });

  if (insertError) {
    throw new Error(`Unable to join session: ${insertError.message}`);
  }

  const nextCount = count + 1;
  const shouldActivate = nextCount >= session.max_players && session.status !== "active";

  if (shouldActivate) {
    await supabase.from("sessions").update({ status: "active" }).eq("id", id);
  }

  const refreshed = await fetchSessionById(id);

  if (!refreshed) {
    throw new Error("Failed to reload session after join.");
  }

  return {
    session: mapRowToSession(refreshed),
    activated: shouldActivate,
  };
}

export async function deleteSession(id: string): Promise<Session | null> {
  const supabase = admin();
  const existing = await fetchSessionById(id);

  if (!existing) {
    return null;
  }

  const { error } = await supabase.from("sessions").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete session: ${error.message}`);
  }

  return mapRowToSession(existing);
}
