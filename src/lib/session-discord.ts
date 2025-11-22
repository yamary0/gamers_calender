import type { DiscordWebhookPayload } from "@/lib/discord";
import type { Session } from "@/services/session-store";

export type SessionNotificationEvent = "created" | "joined" | "activated" | "starting";

type SessionNotificationContext = {
  event: SessionNotificationEvent;
  session: Session;
  guildName: string;
  sessionUrl?: string | null;
  actorName?: string | null;
};

type EventMeta = {
  emoji: string;
  label: string;
  color: number;
  reason: (actorName?: string | null) => string;
};

const EVENT_META: Record<SessionNotificationEvent, EventMeta> = {
  created: {
    emoji: "🆕",
    label: "New session",
    color: 0x5865f2,
    reason: (actorName) => `${actorName ?? "A member"} created this session.`,
  },
  joined: {
    emoji: "👥",
    label: "Someone joined",
    color: 0x57f287,
    reason: (actorName) => `${actorName ?? "A member"} just joined.`,
  },
  activated: {
    emoji: "✅",
    label: "Session ready",
    color: 0xfee75c,
    reason: () => "Party is full and marked active.",
  },
  starting: {
    emoji: "🕒",
    label: "Starting now",
    color: 0xf04747,
    reason: () => "Start time reached - jump in if you are playing.",
  },
};

const unixFromISO = (iso: string): number =>
  Math.floor(new Date(iso).getTime() / 1000);

const formatSchedule = (session: Session): string => {
  if (session.schedule.kind === "timed") {
    const start = unixFromISO(session.schedule.startAt);
    const end = session.schedule.endAt ? unixFromISO(session.schedule.endAt) : null;
    const endLine = end ? `Ends <t:${end}:t>` : "End time TBD";
    return `Starts <t:${start}:F> (<t:${start}:R>)\n${endLine}`;
  }

  if (session.schedule.kind === "all-day") {
    const start = unixFromISO(session.schedule.date);
    return `All day on <t:${start}:D>`;
  }

  return "Unscheduled - watch for updates.";
};

const formatPlayers = (session: Session): string => {
  const current = session.participants.length;
  const remaining = Math.max(session.maxPlayers - current, 0);
  const suffix =
    remaining === 0
      ? "Full"
      : remaining === 1
        ? "1 seat left"
        : `${remaining} seats left`;
  return `${current}/${session.maxPlayers} players • ${suffix}`;
};

const formatStatus = (session: Session): string =>
  session.status === "active" ? "Active • ready to play" : "Open • filling seats";

const formatRelevance = (session: Session): string => {
  const remaining = Math.max(session.maxPlayers - session.participants.length, 0);

  if (session.status === "active") {
    return "Lobby is ready.";
  }

  if (remaining === 0) {
    return "Lobby is full.";
  }

  if (remaining === 1) {
    return "1 seat left.";
  }

  return `${remaining} seats left.`;
};

const buildContent = (
  meta: EventMeta,
  title: string,
  guildName: string,
  sessionUrl?: string | null,
) => {
  const summary = `${meta.emoji} ${meta.label} in ${guildName}: ${title}`;
  return sessionUrl ? `${summary}\n${sessionUrl}` : summary;
};

export function buildSessionDiscordPayload({
  event,
  session,
  guildName,
  sessionUrl,
  actorName,
}: SessionNotificationContext): DiscordWebhookPayload {
  const meta = EVENT_META[event];
  const relevance = formatRelevance(session);

  return {
    content: buildContent(meta, session.title, guildName, sessionUrl),
    embeds: [
      {
        title: session.title,
        description: `${meta.reason(actorName)} ${relevance}`,
        url: sessionUrl ?? undefined,
        color: meta.color,
        fields: [
          { name: "When", value: formatSchedule(session), inline: false },
          { name: "Players", value: formatPlayers(session), inline: true },
          { name: "Status", value: formatStatus(session), inline: true },
          ...(sessionUrl
            ? [{ name: "Session link", value: sessionUrl, inline: false }]
            : []),
        ],
        footer: { text: `Guild: ${guildName}` },
      },
    ],
  };
}
