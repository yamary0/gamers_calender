"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseISO, format, isToday, isTomorrow, isYesterday, startOfToday } from "date-fns";
import { ArrowDown, Loader2 } from "lucide-react";
import { ErrorToast } from "@/components/error-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { SessionsCalendar } from "@/components/sessions-calendar";
import { useGuilds } from "@/components/guild-provider";
import type { Session } from "@/services/session-store";
import { useMediaQuery } from "@/lib/use-media-query";
import { SessionCard } from "@/components/session-card";
import { CreateSessionDialog } from "@/components/create-session-dialog";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";

type SessionsDashboardProps = {
  initialSessions: Session[];
};

export function SessionsDashboard({
  initialSessions,
}: SessionsDashboardProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeView, setActiveView] = useState<"feed" | "calendar">("calendar");
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [hasFetched, setHasFetched] = useState(initialSessions.length > 0);
  const [isPastCollapsed, setIsPastCollapsed] = useState(true);
  const router = useRouter();

  const { session, user } = useAuth();
  const {
    guilds,
    selectedGuildId,
    loading: guildLoading,
  } = useGuilds();

  const accessToken = session?.access_token ?? null;
  const canMutate = Boolean(accessToken);
  const hasGuild = Boolean(selectedGuildId);
  const selectedGuild = guilds.find((guild) => guild.id === selectedGuildId) ?? null;
  const userId = user?.id ?? null;
  const isTabletUp = useMediaQuery("(min-width: 768px)");
  const isMobile = !isTabletUp;

  useEffect(() => {
    if (!isTabletUp) {
      setActiveView("feed");
    }
  }, [isTabletUp]);

  const fetchSessions = useCallback(async (): Promise<Session[]> => {
    if (!canMutate || !selectedGuildId) {
      return [];
    }

    const headers: HeadersInit = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {};

    const response = await fetch(`/api/guilds/${selectedGuildId}/sessions`, {
      cache: "no-store",
      headers,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return [];
      }
      throw new Error(`Failed to fetch sessions: ${response.status}`);
    }

    const data = (await response.json()) as { data: Session[] };
    return data.data;
  }, [accessToken, canMutate, selectedGuildId]);

  const refreshSessions = useCallback(async () => {
    setIsFetching(true);
    try {
      const data = await fetchSessions();
      setSessions(data);
      setHasFetched(true);
    } finally {
      setIsFetching(false);
    }
  }, [fetchSessions]);

  const handleRefresh = useCallback(async () => {
    setFormError(null);
    try {
      await refreshSessions();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to refresh sessions",
      );
    }
  }, [refreshSessions]);

  const shouldShowSkeleton =
    (isFetching || (!hasFetched && canMutate && hasGuild && Boolean(selectedGuildId))) &&
    activeView === "feed";

  const {
    distance: pullDistance,
    progress: pullProgress,
    threshold: pullThreshold,
    isRefreshing: isPullRefreshing,
    handlers: pullHandlers,
  } = usePullToRefresh({
    enabled: isMobile,
    onRefresh: handleRefresh,
  });

  const getScheduleStartInstant = (session: Session) => {
    switch (session.schedule.kind) {
      case "all-day":
        return parseISO(session.schedule.date).getTime();
      case "timed":
        return parseISO(session.schedule.startAt).getTime();
      default:
        return parseISO(session.createdAt).getTime();
    }
  };

  const getSessionDate = (session: Session): string => {
    switch (session.schedule.kind) {
      case "all-day":
        return session.schedule.date;
      case "timed":
        return session.schedule.startAt.split('T')[0];
      default:
        return "9999-12-31"; // Special marker for no-schedule sessions to sort them last
    }
  };

  const formatDateLabel = (dateString: string): string => {
    if (dateString === "9999-12-31") return "No Schedule";
    const date = parseISO(dateString);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  const groupedSessions = useMemo(() => {
    const sorted = [...sessions].sort(
      (first, second) =>
        getScheduleStartInstant(first) - getScheduleStartInstant(second),
    );

    const groups = new Map<string, Session[]>();
    sorted.forEach((session) => {
      const dateKey = getSessionDate(session);
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(session);
    });

    // Sort groups by date, with "No Schedule" (9999-12-31) at the end
    return Array.from(groups.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, sessions]) => ({
        date,
        label: formatDateLabel(date),
        sessions,
      }));
  }, [sessions]);

  const calendarSessions = useMemo(
    () =>
      [...sessions].sort(
        (first, second) =>
          getScheduleStartInstant(first) - getScheduleStartInstant(second),
      ),
    [sessions],
  );

  const todayStart = useMemo(() => startOfToday().getTime(), []);

  const isPastGroup = useCallback(
    (dateString: string) => {
      if (dateString === "9999-12-31") return false;
      const date = parseISO(dateString);
      return date.getTime() < todayStart;
    },
    [todayStart],
  );

  useEffect(() => {
    let cancelled = false;

    if (!canMutate || !selectedGuildId) {
      setSessions([]);
      setIsFetching(false);
      setHasFetched(false);
      return;
    }

    setSessions([]);
    setIsFetching(true);
    setHasFetched(false);

    startTransition(async () => {
      try {
        const data = await fetchSessions();
        if (!cancelled) {
          setSessions(data);
          setHasFetched(true);
        }
      } catch (error) {
        if (!cancelled) {
          setFormError(
            error instanceof Error ? error.message : "Unable to load sessions.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetchSessions]);

  const { upcomingGroups, pastGroups } = useMemo(() => {
    const upcoming: typeof groupedSessions = [];
    const past: typeof groupedSessions = [];

    groupedSessions.forEach((group) => {
      if (isPastGroup(group.date)) {
        past.push(group);
      } else {
        upcoming.push(group);
      }
    });

    return { upcomingGroups: upcoming, pastGroups: past };
  }, [groupedSessions, isPastGroup]);

  function handleToggleParticipation(targetSession: Session) {
    if (!canMutate || !selectedGuildId) {
      setFormError(!canMutate ? "Sign in to manage sessions." : "Select a guild first.");
      return;
    }

    const isParticipant = Boolean(
      userId && targetSession.participants.some((participant) => participant.id === userId),
    );

    if (isParticipant) {
      const confirmed =
        typeof window === "undefined" ||
        window.confirm("Leave this session? Your spot will open for other members.");
      if (!confirmed) {
        return;
      }
    } else if (targetSession.status === "active") {
      setFormError("Session is already active.");
      return;
    }

    setPendingSessionId(targetSession.id);
    startTransition(async () => {
      setFormError(null);
      try {
        const headers: HeadersInit = {};
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }

        const response = await fetch(
          `/api/guilds/${selectedGuildId}/sessions/${targetSession.id}/join`,
          {
            method: isParticipant ? "DELETE" : "POST",
            headers,
          },
        );

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(
            body?.error ?? (isParticipant ? "Failed to leave session" : "Failed to join session"),
          );
        }

        await refreshSessions();
      } catch (error) {
        setFormError(
          error instanceof Error
            ? error.message
            : "Unable to update session membership",
        );
      } finally {
        setPendingSessionId((current) =>
          current === targetSession.id ? null : current,
        );
      }
    });
  }

  return (
    <section className="space-y-6">
      {formError && <ErrorToast message={formError} />}

      {/* Active Guild Indicator */}
      {selectedGuild && (
        <button
          onClick={() => router.push(`/g/${selectedGuild.slug}`)}
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
            {selectedGuild.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-foreground">{selectedGuild.name}</span>
        </button>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {isTabletUp && (
          <div
            role="tablist"
            aria-label="Session view"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 p-1"
          >
            <Button
              type="button"
              role="tab"
              aria-selected={activeView === "feed"}
              variant={activeView === "feed" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveView("feed")}
            >
              Feed
            </Button>
            <Button
              type="button"
              role="tab"
              aria-selected={activeView === "calendar"}
              variant={activeView === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveView("calendar")}
            >
              Calendar
            </Button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {guildLoading ? (
            <span>Loading guilds…</span>
          ) : guilds.length === 0 ? (
            <span>Create or join a guild to start sharing sessions.</span>
          ) : !selectedGuild ? (
            <span>Select a guild to view sessions</span>
          ) : (
            <span className="text-muted-foreground/70">
              {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {isTabletUp && activeView === "calendar" ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              {canMutate && hasGuild && selectedGuildId && (
                <CreateSessionDialog
                  guildId={selectedGuildId}
                  accessToken={accessToken}
                  onSessionCreated={handleRefresh}
                  trigger={
                    <Button size="sm" className="h-8 text-xs">
                      + Session
                    </Button>
                  }
                />
              )}
            </div>
            <SessionsCalendar
              sessions={calendarSessions}
            />
          </div>
        ) : (
          <div
            {...pullHandlers}
            className={isMobile ? "space-y-4 touch-pan-y" : "space-y-4"}
          >
            {isMobile && (
              <div
                className="relative -mx-4 h-0 px-4 overflow-visible"
                aria-live="polite"
                aria-atomic="true"
              >
                <div
                  className="pointer-events-none flex justify-center transition-all duration-150"
                  style={{
                    transform: `translateY(${pullDistance}px)`,
                    opacity: pullDistance > 0 || isPullRefreshing ? 1 : 0,
                  }}
                >
                  <div className="inline-flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1 text-[11px] font-semibold text-foreground shadow-md">
                    {isPullRefreshing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <ArrowDown
                        className="h-3.5 w-3.5 transition-transform duration-150"
                        aria-hidden="true"
                        style={{ transform: `rotate(${Math.min(180, pullProgress * 180)}deg)` }}
                      />
                    )}
                    <span className="text-foreground/80">
                      {isPullRefreshing
                        ? "Refreshing"
                        : pullDistance >= pullThreshold
                          ? "Release"
                          : "Pull to refresh"}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* Feed Header / Actions */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Active Sessions</h2>
              <div className="flex items-center gap-2">
                {canMutate && hasGuild && selectedGuildId && (
                  <CreateSessionDialog
                    guildId={selectedGuildId}
                    accessToken={accessToken}
                    onSessionCreated={handleRefresh}
                    trigger={
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        + Session
                      </Button>
                    }
                  />
                )}
                {isTabletUp && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => startTransition(() => void handleRefresh())}
                    disabled={isPending || isPullRefreshing}
                    className="h-8 text-xs"
                  >
                    Refresh
                  </Button>
                )}
              </div>
            </div>

            {/* Grid Feed */}
            {shouldShowSkeleton ? (
              <div className="space-y-3">
                {[0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-border bg-card/60 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-20 animate-pulse rounded-full bg-muted" />
                      <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-muted/70" />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {[0, 1, 2, 3].map((bubble) => (
                          <div
                            key={bubble}
                            className="h-7 w-7 rounded-full border border-background bg-muted/70 shadow-sm"
                          />
                        ))}
                      </div>
                      <div className="h-4 w-16 animate-pulse rounded bg-muted/80" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                {!canMutate
                  ? "Sign in to view guild sessions."
                  : !hasGuild
                    ? "Select or create a guild to view sessions."
                    : "No sessions yet. Create one to get started!"}
              </div>
            ) : (
              <div className="space-y-6">
                {upcomingGroups.map((group) => (
                  <div key={group.date} className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {group.sessions.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          userId={userId}
                          selectedGuildSlug={selectedGuild?.slug}
                          onJoin={() => handleToggleParticipation(session)}
                          onLeave={() => handleToggleParticipation(session)}
                          isPending={pendingSessionId === session.id}
                          canMutate={canMutate}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {pastGroups.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Past Sessions
                      </h3>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsPastCollapsed((prev) => !prev)}
                        className="h-7 text-[11px]"
                      >
                        {isPastCollapsed ? "Show" : "Hide"}
                      </Button>
                    </div>
                    {isPastCollapsed ? (
                      <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
                        Past sessions hidden — tap “Show” to expand.
                      </div>
                    ) : (
                      pastGroups.map((group) => (
                        <div key={group.date} className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {group.label}
                          </p>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {group.sessions.map((session) => (
                              <SessionCard
                                key={session.id}
                                session={session}
                                userId={userId}
                                selectedGuildSlug={selectedGuild?.slug}
                                onJoin={() => handleToggleParticipation(session)}
                                onLeave={() => handleToggleParticipation(session)}
                                isPending={pendingSessionId === session.id}
                                canMutate={canMutate}
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
