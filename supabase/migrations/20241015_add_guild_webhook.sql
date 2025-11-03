alter table public.guilds
  add column if not exists discord_webhook_url text;
