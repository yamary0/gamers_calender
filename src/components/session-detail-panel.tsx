"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { CalendarClock, Users, ArrowLeft, MoreVertical, Trash2, Edit2, RefreshCw } from "lucide-react";
import { ErrorToast } from "@/components/error-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ParticipationForm, type ParticipationFormData } from "@/components/participation-form";
import { useAuth } from "@/components/auth-provider";
import { describeSessionSchedule } from "@/lib/session-formatters";
import {
  buildSchedulePayload,
  getScheduleFormDefaults,
  type ScheduleKind,
} from "@/lib/schedule-utils";
import type { Session } from "@/services/session-store";
import { AvatarStack } from "@/components/avatar-stack";
import { cn } from "@/lib/utils";
import { SessionTimeline } from "@/components/session-timeline";

type SessionDetailPanelProps = {
  initialSession: Session;
  backHref?: string;
};

export function SessionDetailPanel({ initialSession, backHref }: SessionDetailPanelProps) {
  const router = useRouter();
  const [session, setSession] = useState<Session>(initialSession);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

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
  const guildId = session.guildId;
  const userId = user?.id ?? null;
  const currentParticipant = session.participants.find((p) => p.id === userId);
  const isParticipant = Boolean(currentParticipant);

  const createdLabel = format(parseISO(session.createdAt), "MMM d, yyyy HH:mm");
  const canAttemptJoin = session.status !== "active";
  const actionDisabled =
    isPending || !canMutate || !guildId || (!isParticipant && !canAttemptJoin);

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
    if (!guildId) {
      throw new Error("Session is not associated with a guild.");
    }
    const headers: HeadersInit = accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {};
    const response = await fetch(`/api/guilds/${guildId}/sessions/${session.id}`, {
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

  const handleJoinSubmit = (data: ParticipationFormData) => {
    if (!canMutate || !guildId) return;

    startTransition(async () => {
      setFormError(null);
      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }

        const response = await fetch(
          `/api/guilds/${guildId}/sessions/${session.id}/join`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(data),
          },
        );

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? "Failed to update participation");
        }

        await refreshSessionData();
        setIsJoinDialogOpen(false);
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Unable to update participation",
        );
      }
    });
  };

  const handleLeave = () => {
    if (!canMutate || !guildId) return;

    const confirmed = window.confirm("Leave this session? Your spot will open for other members.");
    if (!confirmed) return;

    startTransition(async () => {
      setFormError(null);
      try {
        const headers: HeadersInit = {};
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }
        const response = await fetch(
          `/api/guilds/${guildId}/sessions/${session.id}/join`,
          {
            method: "DELETE",
            headers,
          },
        );
        if (!response.ok) {
          throw new Error("Failed to leave session");
        }
        await refreshSessionData();
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Unable to leave session");
      }
    });
  };

  const handleUpdate: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (!canMutate || !guildId) {
      setFormError(!canMutate ? "Sign in to update sessions." : "Select a guild first.");
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
        const response = await fetch(`/api/guilds/${guildId}/sessions/${session.id}`, {
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
    if (!canMutate || !guildId) {
      setFormError(!canMutate ? "Sign in to delete sessions." : "Select a guild first.");
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
        const response = await fetch(`/api/guilds/${guildId}/sessions/${session.id}`, {
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
        router.push(backHref ?? "/");
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



  if (isEditing) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={cancelEditing}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">Edit Session</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  minLength={3}
                  maxLength={120}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max-players">Max Players</Label>
                <Input
                  id="edit-max-players"
                  type="number"
                  min={1}
                  value={editMaxPlayers}
                  onChange={(e) => setEditMaxPlayers(e.target.value)}
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label>Schedule Type</Label>
                <Select
                  value={editScheduleKind}
                  onValueChange={(v) => setEditScheduleKind(v as ScheduleKind)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Schedule</SelectItem>
                    <SelectItem value="timed">Timed</SelectItem>
                    <SelectItem value="all-day">All Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editScheduleKind === "all-day" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-all-day">Date</Label>
                  <Input
                    id="edit-all-day"
                    type="date"
                    value={editAllDayDate}
                    onChange={(e) => setEditAllDayDate(e.target.value)}
                    required
                    disabled={isPending}
                  />
                </div>
              )}

              {editScheduleKind === "timed" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-start">Start</Label>
                    <Input
                      id="edit-start"
                      type="datetime-local"
                      value={editStartAt}
                      onChange={(e) => setEditStartAt(e.target.value)}
                      required
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-end">End (Optional)</Label>
                    <Input
                      id="edit-end"
                      type="datetime-local"
                      value={editEndAt}
                      onChange={(e) => setEditEndAt(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={cancelEditing} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Navigation & Actions */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
          <Link href={backHref ?? "/"}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Feed
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {canMutate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleRefresh}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </DropdownMenuItem>
                <DropdownMenuItem onClick={beginEditing}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Session
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Session
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-muted/50 p-8 shadow-lg">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide",
                  session.status === "active"
                    ? "bg-blue-500/10 text-blue-400"
                    : "bg-green-500/10 text-green-400"
                )}
              >
                {session.status === "active" ? "Full" : "Recruiting"}
              </span>
              <span className="text-sm text-muted-foreground">
                Created {createdLabel}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {session.title}
            </h1>
            <div className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                <span>{describeSessionSchedule(session)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{session.participants.length}/{session.maxPlayers} Players</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            {isParticipant ? (
              <div className="flex gap-2">

                <Button
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleLeave}
                  disabled={actionDisabled}
                >
                  Leave
                </Button>
              </div>
            ) : (
              <Button
                size="lg"
                disabled={actionDisabled}
                onClick={() => setIsJoinDialogOpen(true)}
              >
                Join Session
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <SessionTimeline session={session} />

      {/* Participants Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Participants</h3>
        <Card>
          <CardContent className="p-6">
            {session.participants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Users className="mb-3 h-10 w-10 opacity-20" />
                <p>No one has joined yet.</p>
                <p className="text-sm">Be the first to join!</p>
              </div>
            ) : (
              <div className="space-y-4">


                <div className="grid gap-3">
                  {session.participants.map((participant) => {
                    const isDiscord = participant.provider === "discord";
                    const label = isDiscord && participant.displayName
                      ? participant.displayName
                      : participant.id;

                    const isCurrentUser = participant.id === userId;

                    return (
                      <div
                        key={participant.id}
                        onClick={() => {
                          if (isCurrentUser) setIsJoinDialogOpen(true);
                        }}
                        className={cn(
                          "relative flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 transition-colors",
                          isCurrentUser && "cursor-pointer hover:bg-muted/50 border-primary/20"
                        )}
                      >
                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-border bg-background">
                          {isDiscord && participant.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={participant.avatarUrl}
                              alt={label}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                              {label.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-sm font-medium text-foreground" title={label}>
                              {label} {isCurrentUser && "(You)"}
                            </p>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              participant.status === "maybe" ? "bg-yellow-500/10 text-yellow-500" :
                                participant.status === "undecided" ? "bg-gray-500/10 text-gray-500" :
                                  "bg-green-500/10 text-green-500"
                            )}>
                              {participant.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {authError && <ErrorToast message={authError} />}
      {formError && <ErrorToast message={formError} />}

      <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isParticipant ? "Edit Participation" : "Join Session"}
            </DialogTitle>
          </DialogHeader>
          <ParticipationForm
            session={session}
            initialData={
              currentParticipant
                ? {
                  status: currentParticipant.status,
                  joinStartAt: currentParticipant.joinStartAt,
                  joinEndAt: currentParticipant.joinEndAt,
                }
                : undefined
            }
            onSubmit={handleJoinSubmit}
            onCancel={() => setIsJoinDialogOpen(false)}
            isPending={isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
