"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useAuth } from "@/components/auth-provider";
import { useGuilds } from "@/components/guild-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type GuildScreenProps = {
  slug: string;
};

type GuildMember = {
  guildId: string;
  userId: string;
  role: "owner" | "member";
  joinedAt: string;
  displayName: string | null;
  provider: string | null;
};

type GuildDetailPayload = {
  guild: {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    createdAt: string;
    webhookUrl: string | null;
  };
  membership: {
    guildId: string;
    userId: string;
    role: "owner" | "member";
    joinedAt: string;
  };
  members: GuildMember[];
};

export function GuildScreen({ slug }: GuildScreenProps) {
  const router = useRouter();
  const { user, session } = useAuth();
  const accessToken = session?.access_token ?? null;
  const { guilds, loading, error, refreshGuilds } = useGuilds();
  const [detail, setDetail] = useState<GuildDetailPayload | null>(null);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editName, setEditName] = useState("");
  const [editWebhook, setEditWebhook] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [invitePending, setInvitePending] = useState(false);
  const [isMutating, startMutation] = useTransition();

  const guild = useMemo(
    () => guilds.find((item) => item.slug === slug) ?? null,
    [guilds, slug],
  );

  const loadDetail = useCallback(async () => {
    if (!guild || !accessToken) {
      setDetail(null);
      setMembers([]);
      return;
    }

    setDetailLoading(true);
    setDetailError(null);

    try {
      const response = await fetch(`/api/guilds/${guild.id}`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? `HTTP ${response.status}`);
      }

      const payload = (await response.json()) as { data: GuildDetailPayload };
      setDetail(payload.data);
      setMembers(payload.data.members);
      setEditName(payload.data.guild.name);
      setEditWebhook(payload.data.guild.webhookUrl ?? "");
      setInviteLink(null);
      setInviteMessage(null);
    } catch (err) {
      setDetail(null);
      setMembers([]);
      setEditName(guild.name);
      setDetailError(err instanceof Error ? err.message : "Failed to load guild.");
    } finally {
      setDetailLoading(false);
    }
  }, [guild, accessToken]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (guild && !detail) {
      setEditName(guild.name);
      setEditWebhook("");
    }
  }, [guild, detail]);

  if (!user) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Sign in required.</p>
        <p className="mt-2">Authenticate to view guild details.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-3 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-[420px] w-full animate-pulse rounded-lg border border-dashed border-border bg-muted/30" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-sm text-destructive">
        <p className="font-medium">Failed to load guilds.</p>
        <p className="mt-2 text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Guild not found.</p>
        <p className="mt-2">
          Ensure you are a member of this guild or select it from the switcher in the header.
        </p>
        <div className="mt-4">
          <Button type="button" variant="outline" onClick={() => router.push("/")}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = detail?.membership.role === "owner";
  const createdAt = detail?.guild.createdAt ?? null;
  const webhookConfigured = detail?.guild.webhookUrl ?? null;

  const handleUpdate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!guild || !accessToken) {
      setActionError("Authentication required.");
      return;
    }
    const name = editName.trim();
    if (name.length < 3) {
      setActionError("Name must be at least 3 characters.");
      return;
    }
    const webhookValue = editWebhook.trim();
    startMutation(async () => {
      setActionError(null);
      const updatePayload: Record<string, unknown> = {};
      if (!detail || name !== detail.guild.name) {
        updatePayload.name = name;
      }
      const normalizedWebhook = webhookValue.length > 0 ? webhookValue : null;
      if (!detail || normalizedWebhook !== (detail.guild.webhookUrl ?? null)) {
        updatePayload.discordWebhookUrl = normalizedWebhook;
      }

      if (Object.keys(updatePayload).length === 0) {
        setActionError("No changes to save.");
        return;
      }

      try {
        const response = await fetch(`/api/guilds/${guild.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(updatePayload),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error ?? `HTTP ${response.status}`);
        }

        const payload = (await response.json()) as { data: GuildDetailPayload };
        setDetail(payload.data);
        setMembers(payload.data.members);
        setEditName(payload.data.guild.name);
        setEditWebhook(payload.data.guild.webhookUrl ?? "");
        await refreshGuilds();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to update guild.");
      }
    });
  };

  const handleGenerateInvite = () => {
    if (!guild || !accessToken) {
      setActionError("Authentication required.");
      return;
    }

    setInvitePending(true);
    setInviteMessage(null);
    setInviteLink(null);
    setActionError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/guilds/${guild.id}/invitations`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error ?? `HTTP ${response.status}`);
        }

        const payload = (await response.json()) as {
          data: { token: string; url: string };
        };

        setInviteLink(payload.data.url);
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(payload.data.url);
            setInviteMessage("Invite link copied to clipboard.");
          } catch {
            setInviteMessage("Invite link generated.");
          }
        } else {
          setInviteMessage("Invite link generated.");
        }
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to create invitation.");
      } finally {
        setInvitePending(false);
      }
    })();
  };

  const handleCopyInvite = async () => {
    if (!inviteLink) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(inviteLink);
        setInviteMessage("Invite link copied to clipboard.");
      } catch {
        setInviteMessage("Copy failed. Copy manually.");
      }
    } else {
      setInviteMessage("Copy unsupported. Copy manually.");
    }
  };

  const handleDelete = () => {
    if (!guild || !accessToken) {
      setActionError("Authentication required.");
      return;
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm("Delete this guild? Sessions and invites will also be removed.")
    ) {
      return;
    }

    startMutation(async () => {
      setActionError(null);
      try {
        const response = await fetch(`/api/guilds/${guild.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.status !== 204 && !response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(payload?.error ?? `HTTP ${response.status}`);
        }

        await refreshGuilds();
        router.push("/");
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to delete guild.");
      }
    });
  };

  return (
    <div className="w-full space-y-8">
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Guild
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">
          {detail?.guild.name ?? guild.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Coordinate sessions scoped to this guild. Share the invite link so others can join.
        </p>
      </div>

      {detailError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {detailError}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Guild overview</CardTitle>
            <CardDescription>Metadata and ownership details.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void loadDetail();
            }}
            disabled={detailLoading}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Guild name
              </dt>
              <dd className="font-medium text-foreground">
                {detail?.guild.name ?? guild.name}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Slug
              </dt>
              <dd className="font-mono text-xs text-muted-foreground">
                {detail?.guild.slug ?? guild.slug}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Created
              </dt>
              <dd>
                {createdAt
                  ? format(new Date(createdAt), "yyyy-MM-dd HH:mm")
                  : "—"}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Your role
              </dt>
              <dd className="capitalize">
                {detail?.membership.role ?? "member"}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Discord webhook
              </dt>
              <dd className="text-xs text-muted-foreground">
                {webhookConfigured ?? "Not configured"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invitations</CardTitle>
          <CardDescription>Generate links to invite new members.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleGenerateInvite}
              disabled={invitePending || !accessToken}
            >
              {invitePending ? "Generating…" : "Generate invite link"}
            </Button>
            {inviteLink && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleCopyInvite()}
              >
                Copy link
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setInviteLink(null);
                setInviteMessage(null);
              }}
              disabled={!inviteLink}
            >
              Clear
            </Button>
          </div>
          {inviteLink && (
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 font-mono text-xs">
              {inviteLink}
            </div>
          )}
          {inviteMessage && (
            <p className="text-xs text-muted-foreground">{inviteMessage}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>Everyone with access to this guild.</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No members yet. Share an invite link to add more players.
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Member</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {members.map((member) => (
                    <tr key={`${member.guildId}-${member.userId}`}>
                      <td className="px-4 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {member.displayName ?? "Unknown player"}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {member.userId}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 capitalize">{member.role}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {format(new Date(member.joinedAt), "yyyy-MM-dd HH:mm")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin actions</CardTitle>
            <CardDescription>Rename or remove the guild.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-3" onSubmit={handleUpdate}>
              <div className="space-y-1">
                <label
                  htmlFor="guild-edit-name"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Guild name
                </label>
                <input
                  id="guild-edit-name"
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  minLength={3}
                  maxLength={120}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  disabled={isMutating}
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="guild-edit-webhook"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Discord webhook URL
                </label>
                <input
                  id="guild-edit-webhook"
                  type="url"
                  value={editWebhook}
                  onChange={(event) => setEditWebhook(event.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  disabled={isMutating}
                />
                <p className="text-[11px] text-muted-foreground">
                  Leave blank to disable notifications for this guild.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isMutating}>
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isMutating}
                  onClick={() => {
                    setEditName(detail?.guild.name ?? guild.name);
                    setEditWebhook(detail?.guild.webhookUrl ?? "");
                  }}
                >
                  Reset
                </Button>
              </div>
            </form>
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
              <p className="font-semibold text-destructive">Danger zone</p>
              <p className="mt-2 text-muted-foreground">
                Deleting a guild removes all sessions and invitations. This action cannot be
                undone.
              </p>
              <Button
                type="button"
                variant="destructive"
                className="mt-3"
                disabled={isMutating}
                onClick={handleDelete}
              >
                Delete guild
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {actionError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {actionError}
        </div>
      )}
    </div>
  );
}
