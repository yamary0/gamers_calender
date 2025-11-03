"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useGuilds } from "@/components/guild-provider";
import { Button } from "@/components/ui/button";

type InviteState =
  | { status: "pending" }
  | { status: "error"; message: string }
  | { status: "success"; guildName: string; slug: string };

export default function GuildInvitePage({ params }: { params: { token: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const { refreshGuilds } = useGuilds();
  const [state, setState] = useState<InviteState>({ status: "pending" });
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!user) {
      startTransition(() => {
        setState({ status: "error", message: "Sign in to accept this invitation." });
      });
      return;
    }

    let cancelled = false;

    const accept = async () => {
      startTransition(() => {
        setState({ status: "pending" });
      });

      try {
        const response = await fetch(`/api/guild-invitations/${params.token}`, {
          method: "POST",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          if (!cancelled) {
            startTransition(() => {
              setState({
                status: "error",
                message: payload?.error ?? "This invite is invalid or already used.",
              });
            });
          }
          return;
        }

        const payload = (await response.json()) as {
          data: { id: string; name: string; slug: string };
        };

        await refreshGuilds();

        if (!cancelled) {
          startTransition(() => {
            setState({ status: "success", guildName: payload.data.name, slug: payload.data.slug });
          });
          router.push(`/g/${payload.data.slug}`);
        }
      } catch (error) {
        if (!cancelled) {
          startTransition(() => {
            setState({
              status: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to accept invitation.",
            });
          });
        }
      }
    };

    void accept();

    return () => {
      cancelled = true;
    };
  }, [params.token, user, router, refreshGuilds]);

  if (state.status === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-lg border border-border bg-card px-6 py-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">Joining guild…</h1>
          <p className="mt-2 text-sm text-muted-foreground">Validating invitation link.</p>
        </div>
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-lg border border-border bg-card px-6 py-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">Welcome to {state.guildName}!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Redirecting you to the guild dashboard…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex max-w-md flex-col gap-4 rounded-lg border border-border bg-card px-6 py-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Invitation needed</h1>
        <p className="text-sm text-muted-foreground">{state.message}</p>
        {!user && (
          <Button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.setItem("gc:return-to", window.location.href);
              }
            }}
          >
            Sign in from header menu
          </Button>
        )}
      </div>
    </div>
  );
}
