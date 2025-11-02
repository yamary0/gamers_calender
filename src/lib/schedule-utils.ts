import { format, parseISO } from "date-fns";
import type { Session, SessionSchedule } from "@/services/session-store";

export type ScheduleKind = "none" | "all-day" | "timed";

export function buildSchedulePayload(
  kind: ScheduleKind,
  allDayDate: string,
  startValue: string,
  endValue: string,
): SessionSchedule {
  if (kind === "none") {
    return { kind: "none" };
  }

  if (kind === "all-day") {
    if (!allDayDate) {
      throw new Error("Select a date for all-day sessions.");
    }
    const iso = new Date(`${allDayDate}T00:00:00`).toISOString();
    return { kind: "all-day", date: iso };
  }

  if (!startValue) {
    throw new Error("Provide a start time for timed sessions.");
  }

  const startISO = new Date(startValue).toISOString();
  let endISO: string | null = null;

  if (endValue) {
    endISO = new Date(endValue).toISOString();
    if (new Date(endISO) <= new Date(startISO)) {
      throw new Error("End time must be after start time.");
    }
  }

  return { kind: "timed", startAt: startISO, endAt: endISO };
}

export function resolveScheduleKind(session: Session): ScheduleKind {
  switch (session.schedule.kind) {
    case "all-day":
      return "all-day";
    case "timed":
      return "timed";
    default:
      return "none";
  }
}

const formatDateInput = (iso: string) => format(parseISO(iso), "yyyy-MM-dd");
const formatDateTimeInput = (iso: string) =>
  format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");

export function getScheduleFormDefaults(session: Session) {
  const kind = resolveScheduleKind(session);

  if (kind === "all-day" && session.schedule.kind === "all-day") {
    return {
      kind,
      allDayDate: formatDateInput(session.schedule.date),
      startAt: "",
      endAt: "",
    };
  }

  if (kind === "timed" && session.schedule.kind === "timed") {
    return {
      kind,
      allDayDate: "",
      startAt: formatDateTimeInput(session.schedule.startAt),
      endAt: session.schedule.endAt
        ? formatDateTimeInput(session.schedule.endAt)
        : "",
    };
  }

  return {
    kind: "none" as const,
    allDayDate: "",
    startAt: "",
    endAt: "",
  };
}
