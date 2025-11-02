"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { parseISO } from "date-fns";
import { ErrorToast } from "@/components/error-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { SessionsCalendar } from "@/components/sessions-calendar";
import { describeSessionSchedule } from "@/lib/session-formatters";
import {
  buildSchedulePayload,
  type ScheduleKind,
} from "@/lib/schedule-utils";
import type { Session } from "@/services/session-store";

type SessionsDashboardProps = {
  initialSessions: Session[];
};

export function SessionsDashboard({
  initialSessions,
}: SessionsDashboardProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [authMode, setAuthMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);
  const [createScheduleKind, setCreateScheduleKind] =
    useState<ScheduleKind>("none");
  const [createAllDayDate, setCreateAllDayDate] = useState("");
  const [createStartAt, setCreateStartAt] = useState("");
  const [createEndAt, setCreateEndAt] = useState("");
  const [activeView, setActiveView] = useState<"feed" | "calendar">("feed");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const {
    user,
    session,
    loading: authLoading,
    authError,
    signInWithEmail,
    signUpWithEmail,
    signInWithDiscord,
    signOut,
    refreshSession,
  } = useAuth();

  const accessToken = session?.access_token ?? null;
  const canMutate = Boolean(accessToken);
 
  async function refreshSessions() {
    const headers: HeadersInit = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {};
    const response = await fetch("/api/sessions", {
      cache: "no-store",
      headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.status}`);
    }
    const data = (await response.json()) as { data: Session[] };
    setSessions(data.data);
  }

  const openCreateForm = () => {
    setFormError(null);
    setCreateScheduleKind("none");
    setCreateAllDayDate("");
    setCreateStartAt("");
    setCreateEndAt("");
    setIsCreateOpen(true);
  };

  const closeCreateForm = () => {
    setIsCreateOpen(false);
  };

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

  const calendarSessions = useMemo(
    () =>
      [...sessions].sort(
        (first, second) =>
          getScheduleStartInstant(first) - getScheduleStartInstant(second),
      ),
    [sessions],
  );

  const handleAuthSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();
    setAuthFeedback(null);
    if (!email || !password) {
      setAuthFeedback("Email and password are required.");
      return;
    }

    if (authMode === "signIn") {
      await signInWithEmail(email, password);
      await refreshSession();
    } else {
      await signUpWithEmail(email, password);
      setAuthFeedback("Sign up successful. Confirm your email before signing in.");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    await refreshSession();
  };

  const handleCreate: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (!canMutate) {
      setFormError("Sign in to create sessions.");
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const maxPlayers = Number(formData.get("maxPlayers"));

    startTransition(async () => {
      setFormError(null);
      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }
        const schedule = buildSchedulePayload(
          createScheduleKind,
          createAllDayDate,
          createStartAt,
          createEndAt,
        );

        const response = await fetch("/api/sessions", {
          method: "POST",
          headers,
          body: JSON.stringify({ title, maxPlayers, schedule }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? "Failed to create session");
        }

        form.reset();
        setCreateScheduleKind("none");
        setCreateAllDayDate("");
        setCreateStartAt("");
        setCreateEndAt("");
        closeCreateForm();
        await refreshSessions();
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Unable to create session",
        );
      }
    });
  };

  function handleJoin(sessionId: string) {
    if (!canMutate) {
      setFormError("Sign in to join sessions.");
      return;
    }
    startTransition(async () => {
      setFormError(null);
      try {
        const headers: HeadersInit = {};
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }

        const response = await fetch(`/api/sessions/${sessionId}/join`, {
          method: "POST",
          headers,
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? "Failed to join session");
        }

        await refreshSessions();
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Unable to join session",
        );
      }
    });
  }


  return (
    <section className="space-y-6">
      {formError && <ErrorToast message={formError} />}

      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>
            Sign in to create and join sessions. Accounts use email + password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {authLoading ? (
            <p className="text-sm text-muted-foreground">Loading session…</p>
          ) : user ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
                <p className="font-medium text-foreground">
                  Signed in as {user.email ?? user.id}
                </p>
                <p className="text-muted-foreground text-xs">
                  User ID: {user.id}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSignOut}
                  disabled={isPending}
                >
                  Sign out
                </Button>
                <span className="text-xs text-muted-foreground">
                  Refresh the page after signing out to clear server state.
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <form className="space-y-4" onSubmit={handleAuthSubmit}>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={authMode === "signIn" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAuthMode("signIn")}
                  >
                    Sign in
                  </Button>
                  <Button
                    type="button"
                    variant={authMode === "signUp" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAuthMode("signUp")}
                  >
                    Sign up
                  </Button>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="auth-email">
                    Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="auth-password">
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    value={password}
                    minLength={6}
                    onChange={(event) => setPassword(event.target.value)}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    placeholder="At least 6 characters"
                  />
                </div>
                <Button type="submit">
                  {authMode === "signIn" ? "Sign in" : "Create account"}
                </Button>
                {authError && <ErrorToast message={authError} />}
                {authFeedback && (
                  <p className="text-xs text-muted-foreground">{authFeedback}</p>
                )}
              </form>
              <div className="flex flex-col items-start gap-2 border-t border-dashed border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Or continue with
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    signInWithDiscord(
                      typeof window !== "undefined"
                        ? `${window.location.origin}/auth/callback`
                        : undefined,
                    )
                  }
                >
                  Sign in with Discord
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      {isCreateOpen && (
        <Card>
          <CardHeader>
            <CardTitle>Create new session</CardTitle>
            <CardDescription>
              Configure the basics and optionally set a schedule.
            </CardDescription>
            <CardAction>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeCreateForm}
              >
                Close
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="create-title">
                  Title
                </label>
                <input
                  id="create-title"
                  name="title"
                  type="text"
                  minLength={3}
                  maxLength={120}
                  required
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  placeholder="Game night in Shibuya"
                  disabled={!canMutate || isPending}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="create-max-players">
                  Maximum players
                </label>
                <input
                  id="create-max-players"
                  name="maxPlayers"
                  type="number"
                  min={1}
                  required
                  defaultValue={4}
                  className="max-w-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  disabled={!canMutate || isPending}
                />
              </div>
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-muted-foreground">
                  Schedule (optional)
                </legend>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={createScheduleKind === "none" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCreateScheduleKind("none")}
                    disabled={!canMutate || isPending}
                  >
                    None
                  </Button>
                  <Button
                    type="button"
                    variant={createScheduleKind === "all-day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCreateScheduleKind("all-day")}
                    disabled={!canMutate || isPending}
                  >
                    All day
                  </Button>
                  <Button
                    type="button"
                    variant={createScheduleKind === "timed" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCreateScheduleKind("timed")}
                    disabled={!canMutate || isPending}
                  >
                    Timed
                  </Button>
                </div>

                {createScheduleKind === "all-day" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="create-all-day-date">
                      Date
                    </label>
                    <input
                      id="create-all-day-date"
                      type="date"
                      value={createAllDayDate}
                      onChange={(event) => setCreateAllDayDate(event.target.value)}
                      className="max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      disabled={!canMutate || isPending}
                      required
                    />
                  </div>
                )}
                {createScheduleKind === "timed" && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground" htmlFor="create-start-at">
                        Start
                      </label>
                      <input
                        id="create-start-at"
                        type="datetime-local"
                        value={createStartAt}
                        onChange={(event) => setCreateStartAt(event.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        disabled={!canMutate || isPending}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground" htmlFor="create-end-at">
                        End (optional)
                      </label>
                      <input
                        id="create-end-at"
                        type="datetime-local"
                        value={createEndAt}
                        onChange={(event) => setCreateEndAt(event.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        disabled={!canMutate || isPending}
                      />
                    </div>
                  </div>
                )}
              </fieldset>
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={isPending || !canMutate}>
                  {!canMutate ? "Sign in to create" : isPending ? "Saving..." : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeCreateForm}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {activeView === "calendar" ? (
          <SessionsCalendar
            sessions={calendarSessions}
            onCreateSession={openCreateForm}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Active sessions</CardTitle>
              <CardDescription>
                Join a session to move it into the ready state.
              </CardDescription>
              <CardAction className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openCreateForm}
                >
                  + Session
                </Button>
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
                >
                  Refresh
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {sessions.length === 0 && (
                  <li className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    No sessions yet. Use + Session to add one.
                  </li>
                )}
                {sessions.map((session) => {
                  const participants = `${session.participants.length}/${session.maxPlayers}`;
                  const isFull = session.status === "active";
                  return (
                    <li
                      key={session.id}
                      className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 px-4 py-3"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold">{session.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Status:{" "}
                            <span className="font-medium text-foreground">
                              {session.status}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Participants:{" "}
                            <span className="font-medium text-foreground">
                              {participants}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Schedule:{" "}
                            <span className="font-medium text-foreground">
                              {describeSessionSchedule(session)}
                            </span>
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => handleJoin(session.id)}
                            disabled={isPending || isFull || !canMutate}
                          >
                            {!canMutate
                              ? "Sign in"
                              : isFull
                                ? "Ready"
                                : isPending
                                  ? "Joining..."
                                  : "Join"}
                          </Button>
                          <Button asChild variant="secondary">
                            <Link href={`/sessions/${session.id}`}>
                              Details
                            </Link>
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Edit or delete this session from its detail page.
                      </p>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
