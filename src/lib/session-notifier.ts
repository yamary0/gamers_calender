import { sendDiscordNotification } from "@/lib/discord";
import type { Session } from "@/services/session-store";
import type { GuildNotificationSettings } from "@/services/guild-store";

const MAX_TIMEOUT = 2_147_483_647; // ~24 days

const scheduled = new Map<string, NodeJS.Timeout>();

const sessionKey = (guildId: string, sessionId: string) => `${guildId}:${sessionId}`;

type ScheduleConfig = {
  guildId: string;
  session: Session;
  webhookUrl: string | null;
  settings: GuildNotificationSettings;
};

type CancelConfig = {
  guildId: string;
  sessionId: string;
};

const getStartDate = (session: Session): Date | null => {
  if (session.schedule.kind === "timed") {
    return new Date(session.schedule.startAt);
  }
  if (session.schedule.kind === "all-day") {
    // send notification at midnight of the all-day event
    return new Date(session.schedule.date);
  }
  return null;
};

export function scheduleSessionStartNotification({
  guildId,
  session,
  webhookUrl,
  settings,
}: ScheduleConfig) {
  const key = sessionKey(guildId, session.id);

  const existingTimeout = scheduled.get(key);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
    scheduled.delete(key);
  }

  if (!settings.onSessionStart || !webhookUrl) {
    return;
  }

  const startDate = getStartDate(session);
  if (!startDate) {
    return;
  }

  const delay = startDate.getTime() - Date.now();
  if (delay <= 0) {
    void sendDiscordNotification(
      {
        content: `🕒 **Session starting:** ${session.title} is beginning now.`,
      },
      webhookUrl,
    );
    return;
  }

  if (delay > MAX_TIMEOUT) {
    // Prevent scheduling extremely long timeouts; skip silently.
    return;
  }

  const timeout = setTimeout(() => {
    void sendDiscordNotification(
      {
        content: `🕒 **Session starting:** ${session.title} is beginning now.`,
      },
      webhookUrl,
    ).finally(() => {
      scheduled.delete(key);
    });
  }, delay);

  scheduled.set(key, timeout);
}

export function cancelSessionStartNotification({ guildId, sessionId }: CancelConfig) {
  const key = sessionKey(guildId, sessionId);
  const timeout = scheduled.get(key);
  if (timeout) {
    clearTimeout(timeout);
    scheduled.delete(key);
  }
}
