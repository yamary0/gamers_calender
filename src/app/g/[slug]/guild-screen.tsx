"use client";

import { useMemo } from "react";
import { useGuilds } from "@/components/guild-provider";
import { SessionsDashboard } from "@/components/sessions-dashboard";

type GuildScreenProps = {
  slug: string;
};

export function GuildScreen({ slug }: GuildScreenProps) {
  const { guilds, loading, error } = useGuilds();

  const guild = useMemo(
    () => guilds.find((item) => item.slug === slug) ?? null,
    [guilds, slug],
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-3 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-[420px] w-full animate-pulse rounded-lg border border-dashed border-border bg-muted/30" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-sm text-destructive">
        <p className="font-medium">Failed to load guilds.</p>
        <p className="mt-2 text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Guild not found.</p>
        <p className="mt-2">
          Ensure you are a member of this guild or select it from the switcher in the header.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Guild
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">{guild.name}</h1>
        <p className="text-sm text-muted-foreground">
          Coordinate sessions scoped to this guild. Share the invite link so others can join.
        </p>
      </div>
      <SessionsDashboard initialSessions={[]} />
    </div>
  );
}
