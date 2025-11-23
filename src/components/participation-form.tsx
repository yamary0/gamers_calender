"use client";

import { useState, useEffect, useMemo } from "react";
import { format, parseISO, differenceInMinutes, addMinutes, setHours, setMinutes } from "date-fns";
import { Check, HelpCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Session } from "@/services/session-store";

export type ParticipationFormData = {
    status: "definite" | "maybe" | "undecided";
    joinStartAt: string | null;
    joinEndAt: string | null;
};

type ParticipationFormProps = {
    session: Session;
    initialData?: Partial<ParticipationFormData>;
    onSubmit: (data: ParticipationFormData) => void;
    onCancel: () => void;
    isPending?: boolean;
};

export function ParticipationForm({
    session,
    initialData,
    onSubmit,
    onCancel,
    isPending,
}: ParticipationFormProps) {
    const [status, setStatus] = useState<"definite" | "maybe" | "undecided">(
        initialData?.status ?? "definite"
    );

    // Helper to get session bounds
    const sessionBounds = useMemo(() => {
        if (session.schedule.kind === "timed" && session.schedule.startAt && session.schedule.endAt) {
            const start = parseISO(session.schedule.startAt);
            const end = parseISO(session.schedule.endAt);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                return { start, end, hasBounds: true };
            }
        }
        // Fallback for all-day or missing times
        const baseDate = session.schedule.kind === "all-day"
            ? parseISO(session.schedule.date)
            : new Date();

        // Ensure baseDate is valid
        const validBaseDate = isNaN(baseDate.getTime()) ? new Date() : baseDate;

        return {
            start: setMinutes(setHours(validBaseDate, 9), 0), // 09:00 default
            end: setMinutes(setHours(validBaseDate, 23), 0), // 23:00 default
            hasBounds: false,
        };
    }, [session.schedule]);

    // Initialize state
    const [startAt, setStartAt] = useState<string>(
        initialData?.joinStartAt ?? format(sessionBounds.start, "yyyy-MM-dd'T'HH:mm")
    );
    const [endAt, setEndAt] = useState<string>(
        initialData?.joinEndAt ?? format(sessionBounds.end, "yyyy-MM-dd'T'HH:mm")
    );

    // Slider state (minutes from start)
    const totalDuration = differenceInMinutes(sessionBounds.end, sessionBounds.start);
    // Ensure slider values are within bounds
    const [sliderValue, setSliderValue] = useState<[number, number]>([0, Math.max(0, totalDuration)]);
    const [isFullParticipation, setIsFullParticipation] = useState(true);

    // Sync slider when startAt/endAt changes (only if bounds exist)
    useEffect(() => {
        if (!sessionBounds.hasBounds) return;

        const currentStart = parseISO(startAt);
        const currentEnd = parseISO(endAt);

        if (isNaN(currentStart.getTime()) || isNaN(currentEnd.getTime())) return;

        const startDiff = differenceInMinutes(currentStart, sessionBounds.start);
        const endDiff = differenceInMinutes(currentEnd, sessionBounds.start);

        setSliderValue([
            Math.max(0, startDiff),
            Math.min(totalDuration, endDiff)
        ]);

        // Check if full participation
        // Allow small margin of error (e.g. 1 min) or exact match
        const isFull = startDiff <= 0 && endDiff >= totalDuration;
        setIsFullParticipation(isFull);
    }, [startAt, endAt, sessionBounds, totalDuration]);

    const handleSliderChange = (value: number[]) => {
        if (!sessionBounds.hasBounds) return;

        const [startMin, endMin] = value;
        const newStart = addMinutes(sessionBounds.start, startMin);
        const newEnd = addMinutes(sessionBounds.start, endMin);

        setStartAt(format(newStart, "yyyy-MM-dd'T'HH:mm"));
        setEndAt(format(newEnd, "yyyy-MM-dd'T'HH:mm"));
        setIsFullParticipation(startMin === 0 && endMin === totalDuration);
    };

    const toggleFullParticipation = (checked: boolean) => {
        if (checked && sessionBounds.hasBounds) {
            setStartAt(format(sessionBounds.start, "yyyy-MM-dd'T'HH:mm"));
            setEndAt(format(sessionBounds.end, "yyyy-MM-dd'T'HH:mm"));
        }
        setIsFullParticipation(checked);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const toISO = (dateStr: string | null) => {
            if (!dateStr) return null;
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date.toISOString();
        };

        onSubmit({
            status,
            joinStartAt: toISO(startAt),
            joinEndAt: toISO(endAt),
        });
    };

    const statusOptions = [
        { value: "definite", label: "Going", icon: Check, color: "text-green-500" },
        { value: "maybe", label: "Maybe", icon: HelpCircle, color: "text-yellow-500" },
        { value: "undecided", label: "Undecided", icon: Clock, color: "text-gray-400" },
    ] as const;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
                <Label>Participation Status</Label>
                <div className="grid grid-cols-3 gap-2">
                    {statusOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setStatus(option.value)}
                            className={cn(
                                "flex flex-col items-center justify-center gap-2 rounded-lg border p-3 transition-all hover:bg-muted",
                                status === option.value
                                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                                    : "border-border bg-card"
                            )}
                        >
                            <option.icon className={cn("h-5 w-5", option.color)} />
                            <span className="text-xs font-medium">{option.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label>Available Time</Label>
                    {sessionBounds.hasBounds && (
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="full-part"
                                checked={isFullParticipation}
                                onCheckedChange={toggleFullParticipation}
                            />
                            <label
                                htmlFor="full-part"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Full Participation
                            </label>
                        </div>
                    )}
                </div>

                {sessionBounds.hasBounds ? (
                    <div className="space-y-6 rounded-lg border border-border bg-muted/30 p-4">
                        <div className="flex items-center justify-between text-sm font-medium">
                            <span>{format(parseISO(startAt), "HH:mm")}</span>
                            <span className="text-muted-foreground text-xs">to</span>
                            <span>{format(parseISO(endAt), "HH:mm")}</span>
                        </div>

                        <Slider
                            value={[sliderValue[0], sliderValue[1]]}
                            min={0}
                            max={totalDuration}
                            step={15} // 15 minute steps
                            onValueChange={handleSliderChange}
                            className="py-2"
                        />

                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{format(sessionBounds.start, "HH:mm")}</span>
                            <span>{format(sessionBounds.end, "HH:mm")}</span>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="join-start" className="text-xs text-muted-foreground">
                                From
                            </Label>
                            <Input
                                id="join-start"
                                type="datetime-local"
                                value={startAt}
                                onChange={(e) => setStartAt(e.target.value)}
                                disabled={isPending}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="join-end" className="text-xs text-muted-foreground">
                                To
                            </Label>
                            <Input
                                id="join-end"
                                type="datetime-local"
                                value={endAt}
                                onChange={(e) => setEndAt(e.target.value)}
                                disabled={isPending}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving..." : "Confirm"}
                </Button>
            </div>
        </form>
    );
}
