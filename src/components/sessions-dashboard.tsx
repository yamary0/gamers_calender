"use client";

import { useState, useTransition } from "react";
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
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMaxPlayers, setEditMaxPlayers] = useState<string>("1");

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

  const beginEditing = (sessionToEdit: Session) => {
    setFormError(null);
    setEditingSessionId(sessionToEdit.id);
    setEditTitle(sessionToEdit.title);
    setEditMaxPlayers(String(sessionToEdit.maxPlayers));
  };

  const cancelEditing = () => {
    setEditingSessionId(null);
    setEditTitle("");
    setEditMaxPlayers("1");
  };

  const handleEditSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (!editingSessionId) {
      return;
    }
    if (!canMutate) {
      setFormError("Sign in to update sessions.");
      return;
    }

    startTransition(async () => {
      setFormError(null);
      try {
        const title = editTitle.trim();
        const maxPlayers = Number(editMaxPlayers);
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }

        const response = await fetch(`/api/sessions/${editingSessionId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ title, maxPlayers }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? "Failed to update session");
        }

        cancelEditing();
        await refreshSessions();
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Unable to update session",
        );
      }
    });
  };

  const handleDelete = (sessionId: string) => {
    if (!canMutate) {
      setFormError("Sign in to delete sessions.");
      return;
    }

    const confirmed =
      typeof window !== "undefined"
        ? window.confirm("Delete this session? This action cannot be undone.")
        : true;

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      setFormError(null);
      try {
        const headers: HeadersInit = {};
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }

        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: "DELETE",
          headers,
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? "Failed to delete session");
        }

        if (editingSessionId === sessionId) {
          cancelEditing();
        }
        await refreshSessions();
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Unable to delete session",
        );
      }
    });
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

        const response = await fetch("/api/sessions", {
          method: "POST",
          headers,
          body: JSON.stringify({ title, maxPlayers }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? "Failed to create session");
        }

        form.reset();
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

      <Card>
        <CardHeader>
          <CardTitle>Create session</CardTitle>
          <CardDescription>
            Provide a title and headcount to open a new slot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                name="title"
                required
                minLength={3}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                placeholder="Friday Night Raid"
                disabled={!canMutate || isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium text-muted-foreground"
                htmlFor="maxPlayers"
              >
                Maximum players
              </label>
              <input
                id="maxPlayers"
                name="maxPlayers"
                required
                min={1}
                type="number"
                className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                placeholder="5"
                disabled={!canMutate || isPending}
              />
            </div>
            <Button type="submit" disabled={isPending || !canMutate}>
              {!canMutate ? "Sign in to create" : isPending ? "Saving..." : "Create"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {formError && <ErrorToast message={formError} />}

      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>
            Join a session to move it into the ready state.
          </CardDescription>
          <CardAction>
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
                No sessions yet. Create one above to get started.
              </li>
            )}
            {sessions.map((session) => {
              const participants = `${session.participants.length}/${session.maxPlayers}`;
              const isFull = session.status === "active";
              const isEditing = editingSessionId === session.id;
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
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          isEditing ? cancelEditing() : beginEditing(session)
                        }
                        disabled={!canMutate || isPending}
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => handleDelete(session.id)}
                        disabled={!canMutate || isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  {isEditing && (
                    <form
                      className="space-y-3 rounded-md border border-border bg-background px-4 py-3 text-sm shadow-sm"
                      onSubmit={handleEditSubmit}
                    >
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground" htmlFor={`edit-title-${session.id}`}>
                          Title
                        </label>
                        <input
                          id={`edit-title-${session.id}`}
                          value={editTitle}
                          onChange={(event) => setEditTitle(event.target.value)}
                          required
                          minLength={3}
                          className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground" htmlFor={`edit-max-${session.id}`}>
                          Maximum players
                        </label>
                        <input
                          id={`edit-max-${session.id}`}
                          type="number"
                          min={1}
                          value={editMaxPlayers}
                          onChange={(event) => setEditMaxPlayers(event.target.value)}
                          required
                          className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={isPending}>
                          Save changes
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={cancelEditing}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
