"use client";

import Link from "next/link";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { CalendarClock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Session } from "@/services/session-store";
import { describeSessionSchedule } from "@/lib/session-formatters";
import { AvatarStack } from "@/components/avatar-stack";

type SessionCardProps = {
    session: Session;
    userId: string | null;
    selectedGuildSlug?: string;
    onJoin: (session: Session) => void;
    onLeave: (session: Session) => void;
    isPending: boolean;
    canMutate: boolean;
};

export function SessionCard({
    session,
    userId,
    selectedGuildSlug,
    onJoin,
    onLeave,
    isPending,
    canMutate,
}: SessionCardProps) {
    const isParticipant = Boolean(
        userId && session.participants.some((p) => p.id === userId),
    );
    const isFull = session.status === "active";
    const participantCount = session.participants.length;
    const maxPlayers = session.maxPlayers;

    // Helper to format the date nicely
    const getScheduleDisplay = () => {
        if (session.schedule.kind === "none") {
            return "No schedule";
        }
        if (session.schedule.kind === "all-day") {
            const date = parseISO(session.schedule.date);
            if (isToday(date)) return "All Day • Today";
            if (isTomorrow(date)) return "All Day • Tomorrow";
            return `All Day • ${format(date, "MMM d")}`;
        }
        if (session.schedule.kind === "timed") {
            const date = parseISO(session.schedule.startAt);
            const timeStr = format(date, "HH:mm");
            if (isToday(date)) return `Today • ${timeStr}`;
            if (isTomorrow(date)) return `Tomorrow • ${timeStr}`;
            return `${format(date, "MMM d")} • ${timeStr}`;
        }
        return "Scheduled";
    };

    return (
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md">
            {/* Status Badge */}
            <div className="absolute right-3 top-3">
                <span
                    className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        session.status === "active"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-green-500/10 text-green-400"
                    )}
                >
                    {session.status === "active" ? "Full" : "Recruiting"}
                </span>
            </div>

            <div className="mb-4 space-y-2">
                {/* Schedule */}
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span>{getScheduleDisplay()}</span>
                </div>

                {/* Title */}
                <h3 className="line-clamp-2 text-base font-semibold leading-tight text-foreground group-hover:text-primary">
                    {session.title}
                </h3>
            </div>

            <div className="mt-auto space-y-4">
                {/* Participants */}
                <div className="flex items-center justify-between">
                    <AvatarStack participants={session.participants} maxAvatars={5} />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>
                            {participantCount}/{maxPlayers}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant={isParticipant ? "secondary" : "default"}
                        size="sm"
                        className="w-full text-xs"
                        disabled={isPending || !canMutate || (!isParticipant && isFull)}
                        onClick={() => (isParticipant ? onLeave(session) : onJoin(session))}
                    >
                        {isPending ? "..." : isParticipant ? "Leave" : isFull ? "Full" : "Join"}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        asChild
                    >
                        <Link
                            href={
                                selectedGuildSlug
                                    ? `/g/${selectedGuildSlug}/sessions/${session.id}`
                                    : `/sessions/${session.id}`
                            }
                        >
                            Details
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
