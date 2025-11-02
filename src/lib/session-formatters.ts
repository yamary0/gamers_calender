import { format, parseISO } from "date-fns";
import type { Session } from "@/services/session-store";

export function describeSessionSchedule(session: Session): string {
  switch (session.schedule.kind) {
    case "all-day":
      return `All day · ${format(parseISO(session.schedule.date), "MMM d, yyyy")}`;
    case "timed": {
      const startLabel = format(
        parseISO(session.schedule.startAt),
        "MMM d, HH:mm",
      );
      const endLabel = session.schedule.endAt
        ? format(parseISO(session.schedule.endAt), "HH:mm")
        : null;
      return `Scheduled · ${startLabel}${endLabel ? ` – ${endLabel}` : ""}`;
    }
    default:
      return "No schedule set";
  }
}
