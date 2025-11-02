"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ErrorToast } from "@/components/error-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { describeSessionSchedule } from "@/lib/session-formatters";
import {
  buildSchedulePayload,
  getScheduleFormDefaults,
  type ScheduleKind,
} from "@/lib/schedule-utils";
import type { Session } from "@/services/session-store";

type SessionDetailPanelProps = {
  initialSession: Session;
};

export function SessionDetailPanel({ initialSession }: SessionDetailPanelProps) {
  const router = useRouter();
  const [session, setSession] = useState<Session>(initialSession);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  const scheduleDefaults = getScheduleFormDefaults(initialSession);
  const [editTitle, setEditTitle] = useState(initialSession.title);
  const [editMaxPlayers, setEditMaxPlayers] = useState(
    String(initialSession.maxPlayers),
  );
  const [editScheduleKind, setEditScheduleKind] =
    useState<ScheduleKind>(scheduleDefaults.kind);
  const [editAllDayDate, setEditAllDayDate] = useState(
    scheduleDefaults.allDayDate,
  );
  const [editStartAt, setEditStartAt] = useState(scheduleDefaults.startAt);
  const [editEndAt, setEditEndAt] = useState(scheduleDefaults.endAt);

  const {
    user,
    session: authSession,
    loading: authLoading,
    authError,
    refreshSession,
  } = useAuth();

  const accessToken = authSession?.access_token ?? null;
  const canMutate = Boolean(accessToken);

  const createdLabel = format(parseISO(session.createdAt), "MMM d, yyyy HH:mm");
  const participantCount = `${session.participants.length}/${session.maxPlayers}`;
  const canJoin = canMutate && session.status !== "active";

  const applySessionToEditForm = (source: Session) => {
    setEditTitle(source.title);
    setEditMaxPlayers(String(source.maxPlayers));
    const defaults = getScheduleFormDefaults(source);
    setEditScheduleKind(defaults.kind);
    setEditAllDayDate(defaults.allDayDate);
    setEditStartAt(defaults.startAt);
    setEditEndAt(defaults.endAt);
  };

  const refreshSessionData = async () => {
    const headers: HeadersInit = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {};
    const response = await fetch(`/api/sessions/${session.id}`, {
      cache: "no-store",
      headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to refresh session: ${response.status}`);
    }
    const payload = (await response.json()) as { data: Session };
    setSession(payload.data);
    if (!isEditing) {
      applySessionToEditForm(payload.data);
    }
    return payload.data;
  };

  const handleJoin = () => {
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
        const response = await fetch(`/api/sessions/${session.id}/join`, {
          method: "POST",
          headers,
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? "Failed to join session");
        }
        await refreshSessionData();
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Unable to join session",
        );
      }
    });
  };

  const handleUpdate: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (!canMutate) {
      setFormError("Sign in to update sessions.");
      return;
    }

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
          editScheduleKind,
          editAllDayDate,
          editStartAt,
          editEndAt,
        );
        const response = await fetch(`/api/sessions/${session.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            title: editTitle.trim(),
            maxPlayers: Number(editMaxPlayers),
            schedule,
          }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? "Failed to update session");
        }

        const updated = await refreshSessionData();
        setIsEditing(false);
        applySessionToEditForm(updated);
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Unable to update session",
        );
      }
    });
  };

  const handleDelete = () => {
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
        const response = await fetch(`/api/sessions/${session.id}`, {
          method: "DELETE",
          headers,
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? "Failed to delete session");
        }

        await refreshSession();
        router.push("/");
        router.refresh();
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Unable to delete session",
        );
      }
    });
  };

  const handleRefresh = () => {
    startTransition(async () => {
      setFormError(null);
      try {
        await refreshSessionData();
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Unable to refresh session",
        );
      }
    });
  };

  const beginEditing = () => {
    applySessionToEditForm(session);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    applySessionToEditForm(session);
    setIsEditing(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">← Back to dashboard</Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isPending}
          >
            Refresh
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isPending || !canMutate}
          >
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{session.title}</CardTitle>
          <CardDescription>Session overview and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-muted/40 px-3 py-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Status
              </p>
              <p className="text-base font-semibold text-foreground">
                {session.status}
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Participants
              </p>
              <p className="text-base font-semibold text-foreground">
                {participantCount}
              </p>
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Schedule
            </p>
            <p className="text-base font-semibold text-foreground">
              {describeSessionSchedule(session)}
            </p>
          </div>
          <div className="rounded-md border border-dashed border-border bg-muted/10 px-3 py-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Created
            </p>
            <p className="text-base font-semibold text-foreground">
              {createdLabel}
            </p>
            <p className="mt-1 break-words font-mono text-xs text-muted-foreground">
              ID: {session.id}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
          <CardDescription>
            Discord sign-ins show their display name and avatar when available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {session.participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No participants have joined yet.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {session.participants.map((participant) => {
                const isDiscord = participant.provider === "discord";
                const label = isDiscord && participant.displayName
                  ? participant.displayName
                  : participant.id;
                const secondary = isDiscord
                  ? `Discord · ${participant.id}`
                  : `ID · ${participant.id}`;
                const fallbackInitial = label
                  .trim()
                  .charAt(0)
                  .toUpperCase();

                return (
                <li
                  key={participant.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-3"
                >
                  <div className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-xs font-medium text-muted-foreground">
                    {isDiscord && participant.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={participant.avatarUrl}
                        alt={`${label}'s avatar`}
                        referrerPolicy="no-referrer"
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span>{fallbackInitial || "?"}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {label}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {secondary}
                    </span>
                  </div>
                </li>
              );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage session</CardTitle>
          <CardDescription>
            Join, edit, or delete this session. Changes require authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {authLoading ? (
            <p className="text-sm text-muted-foreground">Loading session…</p>
          ) : user ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-3 text-xs">
              <p className="font-medium text-foreground">
                Signed in as {user.email ?? user.id}
              </p>
              <p className="text-muted-foreground">User ID: {user.id}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sign in on the dashboard to manage sessions.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={handleJoin}
              disabled={isPending || !canJoin}
            >
              {!canMutate
                ? "Sign in to join"
                : session.status === "active"
                  ? "Session ready"
                  : isPending
                    ? "Joining..."
                    : "Join session"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={isEditing ? cancelEditing : beginEditing}
              disabled={isPending || !canMutate}
            >
              {isEditing ? "Cancel" : "Edit session"}
            </Button>
          </div>

          {isEditing && (
            <form
              className="space-y-3 rounded-md border border-border bg-background px-4 py-3 text-sm shadow-sm"
              onSubmit={handleUpdate}
            >
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="detail-edit-title"
                >
                  Title
                </label>
                <input
                  id="detail-edit-title"
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  required
                  minLength={3}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="detail-edit-max"
                >
                  Maximum players
                </label>
                <input
                  id="detail-edit-max"
                  type="number"
                  min={1}
                  value={editMaxPlayers}
                  onChange={(event) => setEditMaxPlayers(event.target.value)}
                  required
                  className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-muted-foreground">
                  Schedule
                </legend>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={editScheduleKind === "none" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditScheduleKind("none")}
                  >
                    None
                  </Button>
                  <Button
                    type="button"
                    variant={
                      editScheduleKind === "all-day" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setEditScheduleKind("all-day")}
                  >
                    All day
                  </Button>
                  <Button
                    type="button"
                    variant={
                      editScheduleKind === "timed" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setEditScheduleKind("timed")}
                  >
                    Timed
                  </Button>
                </div>
                {editScheduleKind === "all-day" && (
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-xs font-medium text-muted-foreground"
                      htmlFor="detail-edit-all-day"
                    >
                      Date
                    </label>
                    <input
                      id="detail-edit-all-day"
                      type="date"
                      value={editAllDayDate}
                      onChange={(event) => setEditAllDayDate(event.target.value)}
                      className="max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      required
                    />
                  </div>
                )}
                {editScheduleKind === "timed" && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="flex flex-col gap-1.5">
                      <label
                        className="text-xs font-medium text-muted-foreground"
                        htmlFor="detail-edit-start"
                      >
                        Start
                      </label>
                      <input
                        id="detail-edit-start"
                        type="datetime-local"
                        value={editStartAt}
                        onChange={(event) => setEditStartAt(event.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        className="text-xs font-medium text-muted-foreground"
                        htmlFor="detail-edit-end"
                      >
                        End (optional)
                      </label>
                      <input
                        id="detail-edit-end"
                        type="datetime-local"
                        value={editEndAt}
                        onChange={(event) => setEditEndAt(event.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      />
                    </div>
                  </div>
                )}
              </fieldset>
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Save changes"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={cancelEditing}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {authError && <ErrorToast message={authError} />}
          {formError && <ErrorToast message={formError} />}
        </CardContent>
      </Card>
    </div>
  );
}
