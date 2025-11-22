"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { buildSchedulePayload, type ScheduleKind } from "@/lib/schedule-utils";
import type { Session } from "@/services/session-store";

type CreateSessionDialogProps = {
    guildId: string;
    accessToken: string | null;
    onSessionCreated: () => Promise<void>;
    trigger?: React.ReactNode;
};

export function CreateSessionDialog({
    guildId,
    accessToken,
    onSessionCreated,
    trigger,
}: CreateSessionDialogProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [scheduleKind, setScheduleKind] = useState<ScheduleKind>("none");
    const [allDayDate, setAllDayDate] = useState("");
    const [startAt, setStartAt] = useState(""); // ISO string
    const [endAt, setEndAt] = useState("");

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        const title = String(formData.get("title") ?? "").trim();
        const maxPlayers = Number(formData.get("maxPlayers"));
        startTransition(async () => {
            try {
                const headers: HeadersInit = {
                    "Content-Type": "application/json",
                };
                if (accessToken) {
                    headers.Authorization = `Bearer ${accessToken}`;
                }
                const schedule = buildSchedulePayload(
                    scheduleKind,
                    allDayDate,
                    startAt,
                    endAt,
                );
                const response = await fetch(`/api/guilds/${guildId}/sessions`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ title, maxPlayers, schedule }),
                });
                if (!response.ok) {
                    const body = (await response.json().catch(() => null)) as
                        | { error?: string }
                        | null;
                    throw new Error(body?.error ?? "Failed to create session");
                }
                await onSessionCreated();
                setOpen(false);
                // Reset form
                setScheduleKind("none");
                setAllDayDate("");
                setStartAt("");
                setEndAt("");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to create session");
            }
        });
    };

    // Helper to set a date (YYYY-MM-DD) for all‑day schedule
    const setPresetDate = (dateStr: string) => {
        setScheduleKind("all-day");
        setAllDayDate(dateStr);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger ?? <Button>Create Session</Button>}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Session</DialogTitle>
                    <DialogDescription>
                        Set up a new gaming session for your guild.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            name="title"
                            placeholder="e.g. Friday Night Raid"
                            required
                            minLength={3}
                            maxLength={120}
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="maxPlayers">Max Players</Label>
                        <Input
                            id="maxPlayers"
                            name="maxPlayers"
                            type="number"
                            min={1}
                            defaultValue={4}
                            required
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Schedule Type</Label>
                        <Select
                            value={scheduleKind}
                            onValueChange={(v) => setScheduleKind(v as ScheduleKind)}
                            disabled={isPending}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select schedule" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No Schedule</SelectItem>
                                <SelectItem value="timed">Timed</SelectItem>
                                <SelectItem value="all-day">All Day</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {scheduleKind === "all-day" && (
                        <div className="space-y-2">
                            <Label htmlFor="allDayDate">Date</Label>
                            <Input
                                id="allDayDate"
                                type="date"
                                value={allDayDate}
                                onChange={(e) => setAllDayDate(e.target.value)}
                                required
                                disabled={isPending}
                            />
                            {/* Quick preset buttons */}
                            <div className="flex space-x-2 mt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPresetDate(new Date().toISOString().split("T")[0])}
                                    disabled={isPending}
                                >
                                    Today
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const tomorrow = new Date(Date.now() + 86400000);
                                        setPresetDate(tomorrow.toISOString().split("T")[0]);
                                    }}
                                    disabled={isPending}
                                >
                                    Tomorrow
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const now = new Date();
                                        const daysToSat = (6 - now.getDay() + 7) % 7 || 7;
                                        const saturday = new Date(now);
                                        saturday.setDate(now.getDate() + daysToSat);
                                        setPresetDate(saturday.toISOString().split("T")[0]);
                                    }}
                                    disabled={isPending}
                                >
                                    This Weekend
                                </Button>
                            </div>
                        </div>
                    )}
                    {scheduleKind === "timed" && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={startAt.split("T")[0] || ""}
                                    onChange={(e) => {
                                        const datePart = e.target.value;
                                        const timePart = startAt.split("T")[1] || "00:00";
                                        setStartAt(`${datePart}T${timePart}`);
                                    }}
                                    required
                                    disabled={isPending}
                                />
                                <Label htmlFor="startTime" className="mt-1">
                                    Start Time
                                </Label>
                                <Input
                                    id="startTime"
                                    type="time"
                                    value={startAt.split("T")[1] || ""}
                                    onChange={(e) => {
                                        const timePart = e.target.value;
                                        const datePart = startAt.split("T")[0] || new Date().toISOString().split("T")[0];
                                        setStartAt(`${datePart}T${timePart}`);
                                    }}
                                    required
                                    disabled={isPending}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endDate">End Date (Optional)</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={endAt ? endAt.split("T")[0] : ""}
                                    onChange={(e) => {
                                        const datePart = e.target.value;
                                        const timePart = endAt?.split("T")[1] || "";
                                        setEndAt(datePart ? `${datePart}T${timePart}` : "");
                                    }}
                                    disabled={isPending}
                                />
                                <Label htmlFor="endTime" className="mt-1">
                                    End Time (Optional)
                                </Label>
                                <Input
                                    id="endTime"
                                    type="time"
                                    value={endAt ? endAt.split("T")[1] : ""}
                                    onChange={(e) => {
                                        const timePart = e.target.value;
                                        const datePart = endAt?.split("T")[0] || "";
                                        setEndAt(datePart ? `${datePart}T${timePart}` : "");
                                    }}
                                    disabled={isPending}
                                />
                            </div>
                        </div>
                    )}
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Creating..." : "Create Session"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
