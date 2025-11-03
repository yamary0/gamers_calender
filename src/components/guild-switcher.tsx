"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGuilds } from "@/components/guild-provider";
import { Button } from "@/components/ui/button";

export function GuildSwitcher() {
  const router = useRouter();
  const {
    guilds,
    selectedGuildId,
    selectGuild,
    createGuild,
    loading,
  } = useGuilds();
  const [isOpen, setIsOpen] = useState(false);
  const [newGuildName, setNewGuildName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedGuild = guilds.find((guild) => guild.id === selectedGuildId) ?? null;

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newGuildName.trim()) {
      setError("Name is required");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await createGuild(newGuildName.trim());
      setNewGuildName("");
      setIsOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create guild");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        className="flex items-center gap-2 rounded-full border border-border bg-muted/70 px-3 py-1.5 text-xs font-medium"
        onClick={() => setIsOpen((current) => !current)}
        disabled={loading}
      >
        <span className="rounded-full bg-background px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          Guild
        </span>
        <span>{selectedGuild ? selectedGuild.name : "None"}</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-40 mt-2 w-72 rounded-md border border-border bg-popover p-3 text-sm shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your guilds
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNewGuildName("")}
              className="px-2 py-1 text-[11px]"
            >
              New
            </Button>
          </div>
          <div className="space-y-2">
            {guilds.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                You are not a member of any guild yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {guilds.map((guild) => (
                  <li key={guild.id}>
                    <button
                      type="button"
                      onClick={() => {
                        selectGuild(guild.id);
                        setIsOpen(false);
                        router.push(`/g/${guild.slug}`);
                      }}
                      className={`w-full rounded-md border px-3 py-2 text-left text-xs transition hover:border-primary hover:text-primary ${
                        selectedGuildId === guild.id
                          ? "border-primary/60 bg-primary/5"
                          : "border-border bg-background"
                      }`}
                    >
                      <span className="font-medium text-foreground">{guild.name}</span>
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {guild.role}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <form className="mt-3 space-y-2 border-t border-dashed border-border pt-3" onSubmit={handleCreate}>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="new-guild-name">
              Create guild
            </label>
            <input
              id="new-guild-name"
              type="text"
              placeholder="Guild name"
              value={newGuildName}
              onChange={(event) => setNewGuildName(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              disabled={isSubmitting}
            />
            {error && <p className="text-[11px] text-destructive">{error}</p>}
            <Button type="submit" size="sm" className="w-full" disabled={isSubmitting}>
              Create guild
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
