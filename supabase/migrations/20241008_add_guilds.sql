-- Guilds support schema
create table if not exists public.guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.guild_members (
  guild_id uuid not null references public.guilds (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (guild_id, user_id)
);

create table if not exists public.guild_invitations (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  accepted_at timestamptz
);

alter table public.sessions
  add column if not exists guild_id uuid references public.guilds (id) on delete cascade;

create index if not exists sessions_guild_id_idx on public.sessions (guild_id);

comment on table public.guilds is 'Guilds are collaborative spaces that scope sessions.';
comment on table public.guild_members is 'Membership records for users within guilds.';
comment on table public.guild_invitations is 'Invitation tokens for joining guilds.';
