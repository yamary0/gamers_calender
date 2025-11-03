import crypto from "node:crypto";
import { getSupabaseServiceClient } from "@/lib/supabase";

export type GuildRole = "owner" | "member";

export type Guild = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  webhookUrl: string | null;
};

export type GuildMembership = {
  guildId: string;
  userId: string;
  role: GuildRole;
  joinedAt: string;
};

export type GuildMemberDetail = GuildMembership & {
  displayName: string | null;
  provider: string | null;
};

export type GuildWithRole = Guild & { role: GuildRole };

const admin = () => getSupabaseServiceClient();

const slugify = (value: string): string => {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return base.length > 0 ? base : `guild-${crypto.randomUUID().slice(0, 8)}`;
};

async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  const supabase = admin();
  let query = supabase
    .from("guilds")
    .select("id", { count: "exact", head: true })
    .eq("slug", slug);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to check slug: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

async function generateUniqueSlug(
  name: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(name) || "guild";
  let candidate = base;
  let suffix = 2;

  while (await slugExists(candidate, excludeId)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function listGuildsForUser(
  userId: string,
): Promise<GuildWithRole[]> {
  const supabase = admin();
  const { data, error } = await supabase
    .from("guild_members")
    .select("role,joined_at,guilds(id,name,slug,owner_id,created_at,discord_webhook_url)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list guilds: ${error.message}`);
  }

  return (
    data?.map((row) => {
      const guild = (Array.isArray(row.guilds) ? row.guilds[0] : row.guilds) as
        | {
            id?: string;
            name?: string;
            slug?: string;
            owner_id?: string;
            created_at?: string;
            discord_webhook_url?: string | null;
          }
        | null;
      return {
        id: guild?.id ?? "",
        name: guild?.name ?? "",
        slug: guild?.slug ?? "",
        ownerId: guild?.owner_id ?? "",
        createdAt: guild?.created_at ?? "",
        webhookUrl: guild?.discord_webhook_url ?? null,
        role: (row.role ?? "member") as GuildRole,
      };
    }) ?? []
  );
}

export async function getGuildBySlug(slug: string): Promise<Guild | null> {
  const supabase = admin();
  const { data, error } = await supabase
    .from("guilds")
    .select("id,name,slug,owner_id,created_at,discord_webhook_url")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load guild: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    ownerId: data.owner_id,
    createdAt: data.created_at,
    webhookUrl: data.discord_webhook_url ?? null,
  };
}

export async function getGuildById(id: string): Promise<Guild | null> {
  const supabase = admin();
  const { data, error } = await supabase
    .from("guilds")
    .select("id,name,slug,owner_id,created_at,discord_webhook_url")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load guild: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    ownerId: data.owner_id,
    createdAt: data.created_at,
    webhookUrl: data.discord_webhook_url ?? null,
  };
}

export async function createGuild(
  name: string,
  ownerId: string,
): Promise<GuildWithRole> {
  const supabase = admin();
  const slug = await generateUniqueSlug(name);

  const { data, error } = await supabase
    .from("guilds")
    .insert({
      name,
      slug,
      owner_id: ownerId,
    })
    .select("id,name,slug,owner_id,created_at,discord_webhook_url")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create guild: ${error?.message ?? "unknown"}`);
  }

  const { error: memberError } = await supabase
    .from("guild_members")
    .insert({
      guild_id: data.id,
      user_id: ownerId,
      role: "owner",
    });

  if (memberError) {
    throw new Error(`Failed to add guild owner: ${memberError.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    ownerId: data.owner_id,
    createdAt: data.created_at,
    webhookUrl: data.discord_webhook_url ?? null,
    role: "owner",
  };
}

export async function ensureGuildMembership(
  guildId: string,
  userId: string,
): Promise<GuildMembership | null> {
  const supabase = admin();
  const { data, error } = await supabase
    .from("guild_members")
    .select("guild_id,user_id,role,joined_at")
    .eq("guild_id", guildId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check membership: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    guildId: data.guild_id,
    userId: data.user_id,
    role: (data.role ?? "member") as GuildRole,
    joinedAt: data.joined_at,
  };
}

type MemberProfile = {
  displayName: string | null;
  provider: string | null;
};

async function loadMemberProfiles(
  userIds: string[],
): Promise<Map<string, MemberProfile>> {
  const supabase = admin();
  const profiles = new Map<string, MemberProfile>();
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
          provider,
        });
      } catch {
        // ignore individual failures
      }
    }),
  );

  return profiles;
}

export async function listGuildMembers(
  guildId: string,
): Promise<GuildMemberDetail[]> {
  const supabase = admin();
  const { data, error } = await supabase
    .from("guild_members")
    .select("guild_id,user_id,role,joined_at")
    .eq("guild_id", guildId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list guild members: ${error.message}`);
  }

  const rows = data ?? [];
  const profiles = await loadMemberProfiles(rows.map((row) => row.user_id));

  return rows.map((row) => {
    const profile = profiles.get(row.user_id);
    return {
      guildId: row.guild_id,
      userId: row.user_id,
      role: (row.role ?? "member") as GuildRole,
      joinedAt: row.joined_at,
      displayName: profile?.displayName ?? null,
      provider: profile?.provider ?? null,
    };
  });
}

type UpdateGuildInput = {
  name?: string;
  slug?: string;
  webhookUrl?: string | null;
};

export async function updateGuild(
  id: string,
  input: UpdateGuildInput,
): Promise<Guild> {
  const supabase = admin();
  const existing = await getGuildById(id);

  if (!existing) {
    throw new Error("Guild not found");
  }

  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) {
    if (typeof input.name !== "string") {
      throw new Error("name must be a string");
    }
    const trimmed = input.name.trim();
    if (trimmed.length < 3) {
      throw new Error("name must be at least 3 characters");
    }
    updates.name = trimmed;
  }

  if (input.slug !== undefined) {
    if (typeof input.slug !== "string") {
      throw new Error("slug must be a string");
    }
    const trimmed = input.slug.trim();
    if (trimmed.length === 0) {
      throw new Error("slug must not be empty");
    }
    const base = slugify(trimmed);
    if (!base) {
      throw new Error("slug must contain alphanumeric characters");
    }

    const uniqueSlug =
      base === existing.slug ? existing.slug : await generateUniqueSlug(base, id);

    updates.slug = uniqueSlug;
  }

  if (input.webhookUrl !== undefined) {
    if (
      input.webhookUrl !== null &&
      typeof input.webhookUrl !== "string"
    ) {
      throw new Error("webhookUrl must be a string or null");
    }
    const trimmed = input.webhookUrl ?? null;
    const normalized =
      trimmed && typeof trimmed === "string" ? trimmed.trim() : null;
    if (normalized && !normalized.startsWith("https://")) {
      throw new Error("webhookUrl must be a HTTPS URL");
    }
    updates.discord_webhook_url = normalized && normalized.length > 0 ? normalized : null;
  }

  if (Object.keys(updates).length === 0) {
    return existing;
  }

  const { data, error } = await supabase
    .from("guilds")
    .update(updates)
    .eq("id", id)
    .select("id,name,slug,owner_id,created_at,discord_webhook_url")
    .single();

  if (error || !data) {
    throw new Error(`Failed to update guild: ${error?.message ?? "unknown"}`);
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    ownerId: data.owner_id,
    createdAt: data.created_at,
    webhookUrl: data.discord_webhook_url ?? null,
  };
}

export async function deleteGuild(id: string): Promise<void> {
  const supabase = admin();
  const { error } = await supabase.from("guilds").delete().eq("id", id);
  if (error) {
    throw new Error(`Failed to delete guild: ${error.message}`);
  }
}

export async function joinGuild(
  guildId: string,
  userId: string,
): Promise<GuildMembership> {
  const supabase = admin();
  const existing = await ensureGuildMembership(guildId, userId);

  if (existing) {
    return existing;
  }

  const { error } = await supabase.from("guild_members").insert({
    guild_id: guildId,
    user_id: userId,
    role: "member",
  });

  if (error && error.code !== "23505") {
    throw new Error(`Failed to join guild: ${error.message}`);
  }

  const membership = await ensureGuildMembership(guildId, userId);
  if (!membership) {
    throw new Error("Failed to confirm guild membership.");
  }

  return membership;
}

export async function createGuildInvitation(
  guildId: string,
  createdBy: string,
): Promise<string> {
  const supabase = admin();
  const token = crypto.randomUUID().replace(/-/g, "");

  const { error } = await supabase.from("guild_invitations").insert({
    guild_id: guildId,
    created_by: createdBy,
    token,
  });

  if (error) {
    throw new Error(`Failed to create invitation: ${error.message}`);
  }

  return token;
}

export async function acceptInvitation(
  token: string,
  userId: string,
): Promise<GuildWithRole | null> {
  const supabase = admin();

  const { data, error } = await supabase
    .from("guild_invitations")
    .select("guild_id,accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load invitation: ${error.message}`);
  }

  if (!data || data.accepted_at) {
    return null;
  }

  const membership = await ensureGuildMembership(data.guild_id, userId);
  if (!membership) {
    const { error: addError } = await supabase.from("guild_members").insert({
      guild_id: data.guild_id,
      user_id: userId,
      role: "member",
    });

    if (addError && addError.code !== "23505") {
      throw new Error(`Failed to join guild: ${addError.message}`);
    }
  }

  await supabase
    .from("guild_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("token", token);

  const guild = await getGuildById(data.guild_id);
  if (!guild) {
    return null;
  }

  return { ...guild, role: membership?.role ?? "member" };
}
