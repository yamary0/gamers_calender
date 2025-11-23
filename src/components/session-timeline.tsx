"use client";

import { format, parseISO, differenceInMinutes } from "date-fns";
import { Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Session } from "@/services/session-store";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

type SessionTimelineProps = {
    session: Session;
};

export function SessionTimeline({ session }: SessionTimelineProps) {
    if (
        session.schedule.kind !== "timed" ||
        !session.schedule.startAt ||
        !session.schedule.endAt
    ) {
        return null;
    }

    const sessionStart = parseISO(session.schedule.startAt);
    const sessionEnd = parseISO(session.schedule.endAt);
    const totalDuration = differenceInMinutes(sessionEnd, sessionStart);

    if (totalDuration <= 0) return null;

    const getBarStyles = (startAt: string | null, endAt: string | null) => {
        if (!startAt || !endAt) return null;

        const start = parseISO(startAt);
        const end = parseISO(endAt);

        // Clamp to session bounds for visualization
        const effectiveStart = start < sessionStart ? sessionStart : start;
        const effectiveEnd = end > sessionEnd ? sessionEnd : end;

        const startDiff = differenceInMinutes(effectiveStart, sessionStart);
        const duration = differenceInMinutes(effectiveEnd, effectiveStart);

        const leftPercent = (startDiff / totalDuration) * 100;
        const widthPercent = (duration / totalDuration) * 100;

        return {
            left: `${Math.max(0, leftPercent)}%`,
            width: `${Math.min(100, widthPercent)}%`,
        };
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Schedule Overview</h3>
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{format(sessionStart, "HH:mm")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>{format(sessionEnd, "HH:mm")}</span>
                            <Clock className="h-4 w-4" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Session Base Timeline */}
                    <div className="relative">
                        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                            <span className="text-muted-foreground">Session Time</span>
                        </div>
                        <div className="relative h-8 w-full rounded-md bg-muted/30">
                            <div className="absolute inset-0 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <span className="text-xs font-medium text-primary">
                                    {Math.floor(totalDuration / 60)}h {totalDuration % 60 > 0 ? `${totalDuration % 60}m` : ""}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Participants Timeline */}
                    <div className="space-y-3">
                        {session.participants.map((participant) => {
                            const isDiscord = participant.provider === "discord";
                            const label = isDiscord && participant.displayName
                                ? participant.displayName
                                : participant.id;

                            const barStyles = getBarStyles(participant.joinStartAt, participant.joinEndAt);

                            const statusColors = {
                                definite: "bg-green-500",
                                maybe: "bg-yellow-500",
                                undecided: "bg-gray-400",
                            };

                            return (
                                <div key={participant.id} className="relative">
                                    <div className="mb-1 flex items-center justify-between text-xs">
                                        <span className="font-medium truncate max-w-[150px]" title={label}>
                                            {label}
                                        </span>
                                        {participant.joinStartAt && participant.joinEndAt && (
                                            <span className="text-muted-foreground">
                                                {format(parseISO(participant.joinStartAt), "HH:mm")} - {format(parseISO(participant.joinEndAt), "HH:mm")}
                                            </span>
                                        )}
                                    </div>

                                    <div className="relative h-6 w-full rounded-full bg-muted/30">
                                        {/* Grid lines for visual reference */}
                                        <div className="absolute inset-0 flex justify-between px-[1px]">
                                            {[0, 25, 50, 75, 100].map((tick) => (
                                                <div key={tick} className="h-full w-[1px] bg-border/50" style={{ left: `${tick}%` }} />
                                            ))}
                                        </div>

                                        {barStyles ? (
                                            <div
                                                className={cn(
                                                    "absolute h-full rounded-full opacity-90 shadow-sm transition-all",
                                                    statusColors[participant.status]
                                                )}
                                                style={barStyles}
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-[10px] text-muted-foreground italic">
                                                    No time set
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
