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

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export function GuildSwitcher({ trigger, side = "bottom" }: { trigger?: React.ReactNode; side?: "top" | "bottom" }) {
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
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Mobile Drawer / Desktop Popover */}
            <div className="relative z-50">
              {/* We need to portal this or keep it relative. 
                   Since the original was relative structure, we keep the structure but animate the content.
                   However, for the fixed mobile drawer, it needs to be outside the relative flow if possible, 
                   but the current structure has the popover INSIDE the relative container.
                   For fixed positioning to work relative to viewport, it's fine.
               */}
            </div>
          </>
        )}
      </AnimatePresence>

      <div className="relative">
        {trigger ? (
          <div onClick={() => setIsOpen((c) => !c)} role="button" className="cursor-pointer">
            {trigger}
          </div>
        ) : (
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
        )}

        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={popoverRef}
              initial={window.innerWidth < 768 ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
              animate={window.innerWidth < 768 ? { y: 0 } : { opacity: 1, scale: 1 }}
              exit={window.innerWidth < 768 ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                // Common styles
                "z-50 border border-border bg-popover shadow-lg",
                // Mobile: Fixed Bottom Sheet
                "fixed bottom-0 left-0 right-0 w-full rounded-t-xl p-4 pb-safe md:hidden",
                // Desktop: Absolute Popover
                "md:absolute md:w-72 md:rounded-md md:p-3",
                // Desktop positioning
                side === "bottom" ? "md:top-full md:mt-2" : "md:bottom-full md:mb-2",
                // Desktop alignment
                "md:left-1/2 md:-translate-x-1/2 md:sm:left-auto md:sm:right-0 md:sm:max-w-none md:sm:translate-x-0"
              )}
            >
              {/* Mobile Handle */}
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted md:hidden" />

              <div className="mb-4 flex items-center justify-between md:mb-2">
                <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground md:text-xs">
                  Your guilds
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewGuildName("")}
                  className="flex items-center gap-1 px-3 py-1 text-xs md:px-2 md:text-[11px]"
                >
                  <Plus className="h-4 w-4 md:h-3 md:w-3" aria-hidden="true" />
                  New
                </Button>
              </div>

              <div className="max-h-[40vh] overflow-y-auto md:max-h-none">
                <div className="space-y-2">
                  {guilds.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground md:py-0 md:text-left md:text-xs">
                      You are not a member of any guild yet.
                    </p>
                  ) : (
                    <ul className="space-y-2 md:space-y-1">
                      {guilds.map((guild) => {
                        const isSelected = selectedGuildId === guild.id;
                        return (
                          <li key={guild.id}>
                            <div
                              className={cn(
                                "flex items-center gap-3 rounded-lg border px-3 py-3 transition-all md:py-2",
                                isSelected
                                  ? "border-primary/50 bg-primary/10 shadow-sm"
                                  : "border-border bg-background hover:border-border/80 hover:bg-muted/30"
                              )}
                            >
                              {/* Guild Initial Icon */}
                              <div
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold md:h-7 md:w-7 md:text-[10px]",
                                  isSelected
                                    ? "bg-primary/20 text-primary"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {guild.name.charAt(0).toUpperCase()}
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                className="flex-1 justify-start px-0 text-left hover:bg-transparent"
                                onClick={() => {
                                  selectGuild(guild.id);
                                  setIsOpen(false);
                                }}
                              >
                                <span className={cn(
                                  "text-sm md:text-xs",
                                  isSelected ? "font-semibold text-foreground" : "text-foreground/80"
                                )}>
                                  {guild.name}
                                </span>
                              </Button>

                              {/* Check Mark for Selected */}
                              {isSelected && (
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                  <svg
                                    className="h-3 w-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                              )}

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-auto p-1 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  router.push(`/g/${guild.slug}`);
                                  setIsOpen(false);
                                }}
                              >
                                <Eye className="h-4 w-4 md:h-3.5 md:w-3.5" aria-hidden="true" />
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <form className="mt-4 space-y-3 border-t border-dashed border-border pt-4 md:mt-3 md:space-y-2 md:pt-3" onSubmit={handleCreate}>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-[11px]" htmlFor="new-guild-name">
                  Create guild
                </label>
                <div className="flex gap-2">
                  <input
                    id="new-guild-name"
                    type="text"
                    placeholder="Guild name"
                    value={newGuildName}
                    onChange={(event) => setNewGuildName(event.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:text-xs"
                    disabled={isSubmitting}
                  />
                  <Button type="submit" size="sm" disabled={isSubmitting}>
                    Create
                  </Button>
                </div>
                {createError && <p className="text-xs text-destructive md:text-[11px]">{createError}</p>}
              </form>

              <form
                className="mt-4 space-y-3 border-t border-dashed border-border pt-4 md:mt-4 md:space-y-2 md:pt-3"
                onSubmit={handleSearch}
              >
                <label
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-[11px]"
                  htmlFor="join-guild-slug"
                >
                  Join by guild slug
                </label>
                <div className="flex gap-2">
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
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:text-xs"
                    disabled={isJoinLoading || isJoinSubmitting}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isJoinLoading || isJoinSubmitting}
                    className="shrink-0"
                  >
                    {isJoinLoading ? <span className="animate-spin">⟳</span> : <Search className="h-4 w-4" />}
                  </Button>
                </div>

                {joinError && <p className="text-xs text-destructive md:text-[11px]">{joinError}</p>}

                {joinResult && (
                  <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3 text-sm md:p-2 md:text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{joinResult.name}</p>
                        <p className="font-mono text-xs text-muted-foreground md:text-[11px]">{joinResult.slug}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isJoinSubmitting}
                        className="flex items-center gap-1"
                        onClick={() => void handleJoin()}
                      >
                        <UserRoundPlus className="h-4 w-4 md:h-3 md:w-3" aria-hidden="true" />
                        Join
                      </Button>
                    </div>
                    {joinMessage && <p className="text-xs text-muted-foreground md:text-[11px]">{joinMessage}</p>}
                  </div>
                )}

                {/* Clear button for search */}
                {joinSlug && !joinResult && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setJoinSlug("");
                      setJoinResult(null);
                      setJoinError(null);
                      setJoinMessage(null);
                    }}
                    className="h-auto p-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
                  >
                    Clear search
                  </Button>
                )}
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
