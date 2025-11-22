"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Session } from "@/services/session-store";

type Props = {
  sessions: Session[];
  onCreateSession?: () => void;
};

type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
  sessions: Session[];
};

const sessionReferenceDate = (session: Session): Date => {
  switch (session.schedule.kind) {
    case "all-day":
      return parseISO(session.schedule.date);
    case "timed":
      return parseISO(session.schedule.startAt);
    default:
      return parseISO(session.createdAt);
  }
};

function buildCalendarMatrix(activeDate: Date, sessions: Session[]): CalendarDay[][] {
  const monthStart = startOfMonth(activeDate);
  const monthEnd = endOfMonth(activeDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const sessionByDate = new Map<string, Session[]>();

  sessions.forEach((session) => {
    const dayKey = format(sessionReferenceDate(session), "yyyy-MM-dd");
    const list = sessionByDate.get(dayKey) ?? [];
    list.push(session);
    sessionByDate.set(dayKey, list);
  });

  const matrix: CalendarDay[][] = [];
  let current = calendarStart;

  while (current <= calendarEnd) {
    const row: CalendarDay[] = [];
    for (let i = 0; i < 7; i += 1) {
      const dayKey = format(current, "yyyy-MM-dd");
      row.push({
        date: current,
        isCurrentMonth: isSameMonth(current, activeDate),
        sessions: sessionByDate.get(dayKey) ?? [],
      });
      current = addDays(current, 1);
    }
    matrix.push(row);
  }

  return matrix;
}

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function SessionsCalendar({ sessions, onCreateSession }: Props) {
  const [activeDate, setActiveDate] = useState(() => new Date());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(event.matches);
    };
    handleChange(mediaQuery);
    const listener = (event: MediaQueryListEvent) => handleChange(event);
    mediaQuery.addEventListener("change", listener);
    return () => {
      mediaQuery.removeEventListener("change", listener);
    };
  }, []);

  const calendar = useMemo(
    () => {
      // Filter out no-schedule sessions from calendar view
      const scheduledSessions = sessions.filter(
        (session) => session.schedule.kind === "all-day" || session.schedule.kind === "timed"
      );
      return buildCalendarMatrix(activeDate, scheduledSessions);
    },
    [activeDate, sessions],
  );

  const mobileAgenda = useMemo(() => {
    // Filter out no-schedule sessions from mobile agenda
    const scheduledSessions = sessions.filter(
      (session) => session.schedule.kind === "all-day" || session.schedule.kind === "timed"
    );
    const sorted = [...scheduledSessions].sort(
      (a, b) => sessionReferenceDate(a).getTime() - sessionReferenceDate(b).getTime(),
    );
    const groups = new Map<string, Session[]>();
    sorted.forEach((session) => {
      const key = format(sessionReferenceDate(session), "yyyy-MM-dd");
      const list = groups.get(key) ?? [];
      list.push(session);
      groups.set(key, list);
    });
    return Array.from(groups.entries())
      .map(([date, items]) => ({
        date,
        label: format(parseISO(date), "MMM d (EEE)"),
        sessions: items,
      }))
      .slice(0, 30);
  }, [sessions]);

  if (isMobile) {
    return (
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Upcoming sessions</CardTitle>
            {onCreateSession && (
              <Button type="button" size="sm" onClick={onCreateSession}>
                + Session
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Mobile view shows an agenda-style list. Switch to a larger screen for full calendar.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {mobileAgenda.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sessions scheduled yet. Create one to get started.
            </p>
          ) : (
            mobileAgenda.map((group) => (
              <div key={group.date} className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <ul className="space-y-2">
                  {group.sessions.map((session) => {
                    const scheduleLabel = (() => {
                      switch (session.schedule.kind) {
                        case "all-day":
                          return "All day";
                        case "timed":
                          return `${format(parseISO(session.schedule.startAt), "HH:mm")}${session.schedule.endAt
                              ? ` – ${format(parseISO(session.schedule.endAt), "HH:mm")}`
                              : ""
                            }`;
                        default:
                          return "No schedule";
                      }
                    })();
                    return (
                      <li key={session.id}>
                        <Link
                          href={`/sessions/${session.id}`}
                          className="flex flex-col gap-1 rounded-md border border-border bg-background px-3 py-2 text-xs shadow-sm transition hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          <span className="text-sm font-semibold text-foreground">
                            {session.title}
                          </span>
                          <span>
                            {session.participants.length}/{session.maxPlayers} players ·{" "}
                            {scheduleLabel}
                          </span>
                          <span className="uppercase tracking-wide text-[10px] text-muted-foreground">
                            {session.status}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-xl font-semibold">
          Calendar Overview
        </CardTitle>
        <div className="flex items-center gap-2">
          {onCreateSession && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCreateSession}
            >
              + Session
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveDate(addMonths(activeDate, -1))}
          >
            Previous
          </Button>
          <div className="min-w-[140px] text-center text-sm font-medium">
            {format(activeDate, "MMMM yyyy")}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveDate(addMonths(activeDate, 1))}
          >
            Next
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px rounded-lg border border-border bg-border text-xs font-medium text-muted-foreground">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="bg-muted/60 px-2 py-2 text-center uppercase tracking-wide"
            >
              {label}
            </div>
          ))}
          {calendar.map((week, weekIndex) =>
            week.map((day) => (
              <div
                key={`${weekIndex}-${day.date.toISOString()}`}
                className="flex min-h-[110px] flex-col gap-1 bg-background px-2 py-2 text-xs"
                data-current-month={day.isCurrentMonth}
              >
                <span
                  className={`font-semibold ${day.isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                    }`}
                >
                  {format(day.date, "d")}
                </span>
                <div className="flex flex-col gap-1">
                  {day.sessions.map((session) => {
                    const scheduleLabel = (() => {
                      switch (session.schedule.kind) {
                        case "all-day":
                          return "All day";
                        case "timed":
                          return `${format(parseISO(session.schedule.startAt), "HH:mm")}${session.schedule.endAt
                              ? ` – ${format(parseISO(session.schedule.endAt), "HH:mm")}`
                              : ""
                            }`;
                        default:
                          return "No schedule";
                      }
                    })();

                    return (
                      <Link
                        key={session.id}
                        href={`/sessions/${session.id}`}
                        className="rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px] leading-tight text-muted-foreground transition hover:border-primary hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <p className="font-medium text-foreground">{session.title}</p>
                        <p>
                          {session.participants.length}/{session.maxPlayers} players
                        </p>
                        <p className="text-[10px] text-muted-foreground">{scheduleLabel}</p>
                        <p className="uppercase tracking-wide text-[10px]">
                          {session.status}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )),
          )}
        </div>
      </CardContent>
    </Card>
  );
}
