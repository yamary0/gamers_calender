alter table public.guilds
  add column if not exists discord_webhook_url text;

alter table public.guilds
  add column if not exists discord_notification_settings jsonb
  default '{"onSessionCreate": true, "onSessionJoin": true, "onSessionActivate": true, "onSessionStart": false}'::jsonb;
