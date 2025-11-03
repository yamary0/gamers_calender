"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useGuilds } from "@/components/guild-provider";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Eye,
  Plus,
  Search,
  UserRound,
  UserRoundPlus,
} from "lucide-react";

export function GuildSwitcher() {
  const router = useRouter();
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;
  const {
    guilds,
    selectedGuildId,
    selectGuild,
    createGuild,
    refreshGuilds,
    loading,
  } = useGuilds();
  const [isOpen, setIsOpen] = useState(false);
  const [newGuildName, setNewGuildName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinSlug, setJoinSlug] = useState("");
  const [joinResult, setJoinResult] = useState<{ id: string; name: string; slug: string } | null>(
    null,
  );
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoinLoading, setIsJoinLoading] = useState(false);
  const [isJoinSubmitting, setIsJoinSubmitting] = useState(false);
  const selectedGuild = guilds.find((guild) => guild.id === selectedGuildId) ?? null;
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCreateError(null);
      setJoinError(null);
      setJoinMessage(null);
      setJoinResult(null);
      setJoinSlug("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newGuildName.trim()) {
      setCreateError("Name is required");
      return;
    }
    setIsSubmitting(true);
    setCreateError(null);
    try {
      await createGuild(newGuildName.trim());
      setNewGuildName("");
      setIsOpen(false);
    } catch (createError) {
      setCreateError(
        createError instanceof Error ? createError.message : "Failed to create guild",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!accessToken) {
      setJoinError("Sign in required.");
      return;
    }

    const trimmed = joinSlug.trim();
    if (!trimmed) {
      setJoinError("Guild slug is required");
      setJoinResult(null);
      setJoinMessage(null);
      return;
    }

    setJoinError(null);
    setJoinMessage(null);
    setJoinResult(null);
    setIsJoinLoading(true);

    try {
      const response = await fetch(`/api/guilds/search?slug=${encodeURIComponent(trimmed)}`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `HTTP ${response.status}`);
      }

      const payload = (await response.json()) as {
        data: { guild: { id: string; name: string; slug: string }; alreadyMember: boolean };
      };

      setJoinResult(payload.data.guild);
      setJoinMessage(
        payload.data.alreadyMember
          ? "You are already a member of this guild."
          : "Guild found. Join to add it to your list.",
      );
    } catch (searchError) {
      setJoinError(
        searchError instanceof Error ? searchError.message : "Failed to find guild",
      );
    } finally {
      setIsJoinLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinResult) {
      setJoinError("Search for a guild first.");
      return;
    }

    setJoinError(null);
    setJoinMessage(null);
    setIsJoinSubmitting(true);

    if (!accessToken) {
      setJoinError("Sign in required.");
      return;
    }

    try {
      const response = await fetch(`/api/guilds/${joinResult.id}/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `HTTP ${response.status}`);
      }

      const payload = (await response.json()) as {
        data: { guild: { id: string; name: string; slug: string } };
      };

      await refreshGuilds();
      selectGuild(payload.data.guild.id);
      setJoinMessage("Joined successfully. Use View to open the guild.");
    } catch (joinErr) {
      setJoinError(joinErr instanceof Error ? joinErr.message : "Failed to join guild");
    } finally {
      setIsJoinSubmitting(false);
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
        <UserRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="rounded-full bg-background px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          Guild
        </span>
        <span className="flex items-center gap-1">
          {selectedGuild ? selectedGuild.name : "None"}
          <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        </span>
      </Button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 z-40 mt-2 w-72 rounded-md border border-border bg-popover p-3 text-sm shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your guilds
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNewGuildName("")}
              className="flex items-center gap-1 px-2 py-1 text-[11px]"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
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
                    <div
                      className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs transition ${
                        selectedGuildId === guild.id
                          ? "border-primary/60 bg-primary/5"
                          : "border-border bg-background"
                      }`}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex-1 justify-start px-0 text-left hover:bg-transparent"
                        onClick={() => {
                          selectGuild(guild.id);
                          setIsOpen(false);
                        }}
                      >
                        <span className="font-medium text-foreground">{guild.name}</span>
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {guild.role}
                        </span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsOpen(false);
                          router.push(`/g/${guild.slug}`);
                        }}
                        className="flex items-center gap-1 px-2 text-[11px]"
                      >
                        <Eye className="h-3 w-3" aria-hidden="true" />
                        View
                      </Button>
                    </div>
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
            {createError && <p className="text-[11px] text-destructive">{createError}</p>}
            <Button type="submit" size="sm" className="w-full" disabled={isSubmitting}>
              Create guild
            </Button>
          </form>
          <form
            className="mt-4 space-y-2 border-t border-dashed border-border pt-3"
            onSubmit={handleSearch}
          >
            <label
              className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="join-guild-slug"
            >
              Join by guild slug
            </label>
            <input
              id="join-guild-slug"
              type="text"
              placeholder="guild-name-123"
              value={joinSlug}
              onChange={(event) => {
                setJoinSlug(event.target.value);
                setJoinError(null);
                setJoinMessage(null);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              disabled={isJoinLoading || isJoinSubmitting}
            />
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={isJoinLoading || isJoinSubmitting}
                className="flex items-center gap-1"
              >
                <Search className="h-3 w-3" aria-hidden="true" />
                {isJoinLoading ? "Searching…" : "Search"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isJoinLoading || isJoinSubmitting}
                onClick={() => {
                  setJoinSlug("");
                  setJoinResult(null);
                  setJoinError(null);
                  setJoinMessage(null);
                }}
                className="text-[11px]"
              >
                Clear
              </Button>
            </div>
            {joinError && <p className="text-[11px] text-destructive">{joinError}</p>}
            {joinResult && (
              <div className="space-y-2 rounded-md border border-border bg-muted/20 p-2 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{joinResult.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{joinResult.slug}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isJoinSubmitting}
                    className="flex items-center gap-1"
                    onClick={() => void handleJoin()}
                  >
                    <UserRoundPlus className="h-3 w-3" aria-hidden="true" />
                    {isJoinSubmitting ? "Joining…" : "Join"}
                  </Button>
                </div>
                {joinMessage && <p className="text-[11px] text-muted-foreground">{joinMessage}</p>}
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
