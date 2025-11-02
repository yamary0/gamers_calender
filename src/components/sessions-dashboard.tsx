"use client";

import { useState, useTransition } from "react";
import { ErrorToast } from "@/components/error-toast";
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
    <section className="mt-10 space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Create session</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Provide a title and max players to open a new slot.
        </p>
        <form className="mt-4 space-y-4" onSubmit={handleCreate}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-700" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              name="title"
              required
              minLength={3}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              placeholder="Friday Night Raid"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium text-zinc-700"
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
              className="w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              placeholder="5"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isPending ? "Saving..." : "Create"}
          </button>
        </form>
      </div>

      {formError && <ErrorToast message={formError} />}

      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active sessions</h2>
          <button
            type="button"
            className="text-sm font-medium text-zinc-600 underline-offset-2 hover:underline"
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
          >
            Refresh
          </button>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Join a session to reach the ready state.
        </p>

        <ul className="mt-4 space-y-3">
          {sessions.length === 0 && (
            <li className="rounded-md border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
              No sessions yet. Create one above to get started.
            </li>
          )}
          {sessions.map((session) => {
            const participants = `${session.participants.length}/${session.maxPlayers}`;
            const isFull = session.status === "active";
            return (
              <li
                key={session.id}
                className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {session.title}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Status:{" "}
                    <span className="font-medium text-zinc-700">
                      {session.status}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    Participants:{" "}
                    <span className="font-medium text-zinc-700">
                      {participants}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleJoin(session.id)}
                  disabled={isPending || isFull}
                  className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  {isFull ? "Ready" : isPending ? "Joining..." : "Join"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
