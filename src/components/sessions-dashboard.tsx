"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseISO, format, isToday, isTomorrow, isYesterday } from "date-fns";
import { ErrorToast } from "@/components/error-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { SessionsCalendar } from "@/components/sessions-calendar";
import { useGuilds } from "@/components/guild-provider";
import type { Session } from "@/services/session-store";
import { useMediaQuery } from "@/lib/use-media-query";
import { SessionCard } from "@/components/session-card";
import { CreateSessionDialog } from "@/components/create-session-dialog";

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

  useEffect(() => {
    if (!isTabletUp) {
      setActiveView("feed");
    }
  }, [isTabletUp]);

  async function refreshSessions() {
    if (!canMutate || !selectedGuildId) {
      setSessions([]);
      return;
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
        setSessions([]);
        return;
      }
      throw new Error(`Failed to fetch sessions: ${response.status}`);
    }

    const data = (await response.json()) as { data: Session[] };
    setSessions(data.data);
  }

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

  useEffect(() => {
    let cancelled = false;

    if (!canMutate || !selectedGuildId) {
      setSessions([]);
      return;
    }

    startTransition(async () => {
      try {
        const headers: HeadersInit = accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {};
        const response = await fetch(`/api/guilds/${selectedGuildId}/sessions`, {
          cache: "no-store",
          headers,
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            if (!cancelled) {
              setSessions([]);
            }
            return;
          }
          throw new Error(`Failed to fetch sessions: ${response.status}`);
        }
        const data = (await response.json()) as { data: Session[] };
        if (!cancelled) {
          setSessions(data.data);
        }
      } catch (error) {
        if (!cancelled) {
          setFormError(
            error instanceof Error ? error.message : "Unable to load sessions.",
          );
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [canMutate, accessToken, selectedGuildId]);

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
                  onSessionCreated={refreshSessions}
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
          <>
            {/* Feed Header / Actions */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Active Sessions</h2>
              <div className="flex items-center gap-2">
                {canMutate && hasGuild && selectedGuildId && (
                  <CreateSessionDialog
                    guildId={selectedGuildId}
                    accessToken={accessToken}
                    onSessionCreated={refreshSessions}
                    trigger={
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        + Session
                      </Button>
                    }
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await refreshSessions();
                      } catch (error) {
                        setFormError(
                          error instanceof Error
                            ? error.message
                            : "Unable to refresh sessions",
                        );
                      }
                    })
                  }
                  disabled={isPending}
                  className="h-8 text-xs"
                >
                  Refresh
                </Button>
              </div>
            </div>

            {/* Grid Feed */}
            {sessions.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                {!canMutate
                  ? "Sign in to view guild sessions."
                  : !hasGuild
                    ? "Select or create a guild to view sessions."
                    : "No sessions yet. Create one to get started!"}
              </div>
            ) : (
              <div className="space-y-6">
                {groupedSessions.map((group) => (
                  <div key={group.date} className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
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
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
