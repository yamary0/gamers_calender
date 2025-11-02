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

  async function refreshSessions() {
    const response = await fetch("/api/sessions", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.status}`);
    }
    const data = (await response.json()) as { data: Session[] };
    setSessions(data.data);
  }

  const handleCreate: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const maxPlayers = Number(formData.get("maxPlayers"));

    startTransition(async () => {
      setFormError(null);
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
    startTransition(async () => {
      setFormError(null);
      try {
        const response = await fetch(`/api/sessions/${sessionId}/join`, {
          method: "POST",
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
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Create"}
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
              return (
                <li
                  key={session.id}
                  className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
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
                  <Button
                    type="button"
                    onClick={() => handleJoin(session.id)}
                    disabled={isPending || isFull}
                  >
                    {isFull ? "Ready" : isPending ? "Joining..." : "Join"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
