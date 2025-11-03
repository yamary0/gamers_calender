import { getSupabaseServiceClient } from "@/lib/supabase";

export type SessionStatus = "open" | "active";

export type SessionSchedule =
  | { kind: "none" }
  | { kind: "all-day"; date: string }
  | { kind: "timed"; startAt: string; endAt: string | null };

export type SessionParticipant = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  provider: string | null;
};

export type Session = {
  id: string;
  title: string;
  maxPlayers: number;
  status: SessionStatus;
  guildId: string | null;
  participants: SessionParticipant[];
  createdAt: string;
  schedule: SessionSchedule;
};

export type SessionMutationResult = {
  session: Session;
  activated: boolean;
};

export type CreateSessionPayload = {
  title: string;
  maxPlayers: number;
  schedule: SessionSchedule;
};

export type UpdateSessionPayload = Partial<{
  title: string;
  maxPlayers: number;
  status: SessionStatus;
  schedule: SessionSchedule;
}>;

type SessionRow = {
  id: string;
  title: string;
  max_players: number;
  status: string;
  guild_id: string | null;
  created_at: string;
  start_at: string | null;
  end_at: string | null;
  all_day: boolean | null;
  participants?: Array<{ user_id: string }>;
};

type ScheduleColumns = {
  start_at: string | null;
  end_at: string | null;
  all_day: boolean | null;
};

const admin = () => getSupabaseServiceClient();

const mapStatus = (value: string): SessionStatus =>
  value === "active" ? "active" : "open";

const mapRowSchedule = (row: SessionRow): SessionSchedule => {
  if (!row.start_at) {
    return { kind: "none" };
  }

  if (row.all_day) {
    return { kind: "all-day", date: row.start_at };
  }

  return { kind: "timed", startAt: row.start_at, endAt: row.end_at };
};

type ParticipantProfile = {
  displayName: string | null;
  avatarUrl: string | null;
  provider: string | null;
};

const mapRowToSession = (
  row: SessionRow,
  profiles: Map<string, ParticipantProfile>,
): Session => ({
  id: row.id,
  title: row.title,
  maxPlayers: row.max_players,
  status: mapStatus(row.status),
  guildId: row.guild_id ?? null,
  participants:
    row.participants?.map((participant) => {
      const profile = profiles.get(participant.user_id);
      const provider = profile?.provider ?? null;
      const isDiscord = provider === "discord";
      return {
        id: participant.user_id,
        displayName: isDiscord ? profile?.displayName ?? null : null,
        avatarUrl: isDiscord ? profile?.avatarUrl ?? null : null,
        provider,
      };
    }) ?? [],
  createdAt: row.created_at,
  schedule: mapRowSchedule(row),
});

const collectParticipantIds = (rows: SessionRow | SessionRow[]): string[] => {
  const list = Array.isArray(rows) ? rows : [rows];
  const ids = new Set<string>();
  list.forEach((row) => {
    row.participants?.forEach((participant) => {
      if (participant.user_id) {
        ids.add(participant.user_id);
      }
    });
  });
  return [...ids];
};

async function loadParticipantProfiles(
  userIds: string[],
): Promise<Map<string, ParticipantProfile>> {
  const profiles = new Map<string, ParticipantProfile>();

  if (userIds.length === 0) {
    return profiles;
  }

  const supabase = admin();
  const uniqueIds = [...new Set(userIds)];

  await Promise.all(
    uniqueIds.map(async (userId) => {
      try {
        const { data, error } = await supabase.auth.admin.getUserById(userId);
        if (error || !data?.user) {
          return;
        }

        const user = data.user;
        const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
        const displayName =
          typeof metadata.name === "string"
            ? metadata.name
            : typeof metadata.full_name === "string"
              ? metadata.full_name
              : typeof metadata.user_name === "string"
                ? metadata.user_name
                : null;
        const avatarUrl =
          typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;

        const provider =
          typeof user.app_metadata?.provider === "string"
            ? (user.app_metadata.provider as string)
            : Array.isArray(user.identities)
              ? user.identities.find(
                  (identity) =>
                    identity &&
                    typeof identity.provider === "string" &&
                    identity.user_id === userId,
                )?.provider ?? null
              : null;

        profiles.set(userId, {
          displayName,
          avatarUrl,
          provider,
        });
      } catch {
        // Ignore failures for individual users; fall back to id-only display.
      }
    }),
  );

  return profiles;
}

const scheduleToColumns = (schedule: SessionSchedule): ScheduleColumns => {
  switch (schedule.kind) {
    case "none":
      return { start_at: null, end_at: null, all_day: false };
    case "all-day":
      return { start_at: schedule.date, end_at: null, all_day: true };
    case "timed":
      return {
        start_at: schedule.startAt,
        end_at: schedule.endAt ?? null,
        all_day: false,
      };
    default:
      return { start_at: null, end_at: null, all_day: false };
  }
};

async function fetchSessionById(id: string): Promise<SessionRow | null> {
  const supabase = admin();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id,title,max_players,status,guild_id,created_at,start_at,end_at,all_day,participants(user_id)",
    )
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

export async function listSessions(guildId: string): Promise<Session[]> {
  if (!guildId) {
    return [];
  }
  const supabase = admin();

  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id,title,max_players,status,guild_id,created_at,start_at,end_at,all_day,participants(user_id)",
    )
    .eq("guild_id", guildId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list sessions: ${error.message}`);
  }

  const rows = data ?? [];
  const profileMap = await loadParticipantProfiles(collectParticipantIds(rows));

  return rows.map((row) => mapRowToSession(row, profileMap));
}

export async function getSession(id: string): Promise<Session | null> {
  const row = await fetchSessionById(id);
  if (!row) {
    return null;
  }

  const profiles = await loadParticipantProfiles(
    collectParticipantIds(row),
  );

  return mapRowToSession(row, profiles);
}

export async function createSession(
  payload: CreateSessionPayload,
  userId: string,
  guildId: string,
): Promise<SessionMutationResult> {
  const supabase = admin();
  const scheduleCols = scheduleToColumns(payload.schedule);

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      title: payload.title,
      max_players: payload.maxPlayers,
      status: "open",
      guild_id: guildId,
      start_at: scheduleCols.start_at,
      end_at: scheduleCols.end_at,
      all_day: scheduleCols.all_day,
    })
    .select(
      "id,title,max_players,status,guild_id,created_at,start_at,end_at,all_day",
    )
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
  const shouldActivate =
    count >= payload.maxPlayers && data.status !== "active";

  if (shouldActivate) {
    await supabase.from("sessions").update({ status: "active" }).eq("id", data.id);
  }

  const refreshed = await fetchSessionById(data.id);

  if (!refreshed) {
    throw new Error("Failed to reload session after creation.");
  }

  const profiles = await loadParticipantProfiles(collectParticipantIds(refreshed));

  return {
    session: mapRowToSession(refreshed, profiles),
    activated: shouldActivate,
  };
}

export async function updateSession(
  id: string,
  payload: UpdateSessionPayload,
  expectedGuildId?: string,
): Promise<SessionMutationResult> {
  if (
    payload.title === undefined &&
    payload.maxPlayers === undefined &&
    payload.status === undefined &&
    payload.schedule === undefined
  ) {
    throw new Error("Nothing to update.");
  }

  const supabase = admin();
  const existing = await fetchSessionById(id);

  if (!existing) {
    throw new Error("Session not found");
  }

  if (expectedGuildId && existing.guild_id !== expectedGuildId) {
    throw new Error("Session does not belong to this guild");
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
  if (payload.schedule !== undefined) {
    const scheduleCols = scheduleToColumns(payload.schedule);
    updates.start_at = scheduleCols.start_at;
    updates.end_at = scheduleCols.end_at;
    updates.all_day = scheduleCols.all_day;
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
  }

  const profiles = await loadParticipantProfiles(collectParticipantIds(refreshed));

  return {
    session: mapRowToSession(refreshed, profiles),
    activated: existing.status !== "active" && refreshed.status === "active",
  };
}

export type JoinSessionResult = {
  session: Session;
  activated: boolean;
};

export type LeaveSessionResult = {
  session: Session;
  reopened: boolean;
};

export async function joinSession(
  id: string,
  userId: string,
  expectedGuildId?: string,
): Promise<JoinSessionResult> {
  const supabase = admin();
  const session = await fetchSessionById(id);

  if (!session) {
    throw new Error("Session not found");
  }

  if (expectedGuildId && session.guild_id !== expectedGuildId) {
    throw new Error("Session does not belong to this guild");
  }

  const { data: existing } = await supabase
    .from("participants")
    .select("user_id")
    .eq("session_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const profiles = await loadParticipantProfiles(collectParticipantIds(session));
    return { session: mapRowToSession(session, profiles), activated: false };
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

  const profiles = await loadParticipantProfiles(collectParticipantIds(refreshed));

  return {
    session: mapRowToSession(refreshed, profiles),
    activated: shouldActivate,
  };
}

export async function leaveSession(
  id: string,
  userId: string,
  expectedGuildId?: string,
): Promise<LeaveSessionResult> {
  const supabase = admin();
  const existing = await fetchSessionById(id);

  if (!existing) {
    throw new Error("Session not found");
  }

  if (expectedGuildId && existing.guild_id !== expectedGuildId) {
    throw new Error("Session does not belong to this guild");
  }

  const { data: currentParticipant } = await supabase
    .from("participants")
    .select("user_id")
    .eq("session_id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!currentParticipant) {
    const profiles = await loadParticipantProfiles(collectParticipantIds(existing));
    return {
      session: mapRowToSession(existing, profiles),
      reopened: false,
    };
  }

  const { error: deleteError } = await supabase
    .from("participants")
    .delete()
    .eq("session_id", id)
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(`Unable to leave session: ${deleteError.message}`);
  }

  let refreshed = await fetchSessionById(id);

  if (!refreshed) {
    throw new Error("Failed to reload session after leave.");
  }

  let reopened = false;

  const participantTotal = refreshed.participants?.length ?? 0;
  if (existing.status === "active" && participantTotal < existing.max_players) {
    const { error: reopenError } = await supabase
      .from("sessions")
      .update({ status: "open" })
      .eq("id", id);

    if (reopenError) {
      throw new Error(`Failed to reopen session: ${reopenError.message}`);
    }

    refreshed = await fetchSessionById(id);

    if (!refreshed) {
      throw new Error("Failed to reload session after reopen.");
    }

    reopened = true;
  }

  const profiles = await loadParticipantProfiles(collectParticipantIds(refreshed));

  return {
    session: mapRowToSession(refreshed, profiles),
    reopened,
  };
}

export async function deleteSession(
  id: string,
  expectedGuildId?: string,
): Promise<Session | null> {
  const supabase = admin();
  const existing = await fetchSessionById(id);

  if (!existing) {
    return null;
  }

  if (expectedGuildId && existing.guild_id !== expectedGuildId) {
    throw new Error("Session does not belong to this guild");
  }

  const { error } = await supabase.from("sessions").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete session: ${error.message}`);
  }

  const profiles = await loadParticipantProfiles(collectParticipantIds(existing));

  return mapRowToSession(existing, profiles);
}
