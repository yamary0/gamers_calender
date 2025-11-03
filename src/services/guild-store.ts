import crypto from "node:crypto";
import { getSupabaseServiceClient } from "@/lib/supabase";

export type GuildRole = "owner" | "member";

export type Guild = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
};

export type GuildMembership = {
  guildId: string;
  userId: string;
  role: GuildRole;
  joinedAt: string;
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

async function slugExists(slug: string): Promise<boolean> {
  const supabase = admin();
  const { data, error } = await supabase
    .from("guilds")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to check slug: ${error.message}`);
  }

  return Boolean(data);
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "guild";
  const trimmedBase = base.slice(0, 40);

  const buildCandidate = () =>
    `${trimmedBase}-${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`;

  let candidate = buildCandidate();

  while (await slugExists(candidate)) {
    candidate = buildCandidate();
  }

  return candidate;
}

export async function listGuildsForUser(
  userId: string,
): Promise<GuildWithRole[]> {
  const supabase = admin();
  const { data, error } = await supabase
    .from("guild_members")
    .select("role,joined_at,guilds(id,name,slug,owner_id,created_at)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to list guilds: ${error.message}`);
  }

  return (
    data?.map((row) => {
      const guild = Array.isArray(row.guilds) ? row.guilds[0] : row.guilds;
      return {
        id: guild?.id ?? "",
        name: guild?.name ?? "",
        slug: guild?.slug ?? "",
        ownerId: guild?.owner_id ?? "",
        createdAt: guild?.created_at ?? "",
        role: (row.role ?? "member") as GuildRole,
      };
    }) ?? []
  );
}

export async function getGuildBySlug(slug: string): Promise<Guild | null> {
  const supabase = admin();
  const { data, error } = await supabase
    .from("guilds")
    .select("id,name,slug,owner_id,created_at")
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
  };
}

export async function getGuildById(id: string): Promise<Guild | null> {
  const supabase = admin();
  const { data, error } = await supabase
    .from("guilds")
    .select("id,name,slug,owner_id,created_at")
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
    .select("id,name,slug,owner_id,created_at")
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
