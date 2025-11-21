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

    // Form State
    const [scheduleKind, setScheduleKind] = useState<ScheduleKind>("none");
    const [allDayDate, setAllDayDate] = useState("");
    const [startAt, setStartAt] = useState("");
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
                // Reset form defaults
                setScheduleKind("none");
                setAllDayDate("");
                setStartAt("");
                setEndAt("");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to create session");
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ?? <Button>Create Session</Button>}
            </DialogTrigger>
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
                                <SelectValue />
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
                        </div>
                    )}

                    {scheduleKind === "timed" && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startAt">Start Time</Label>
                                <Input
                                    id="startAt"
                                    type="datetime-local"
                                    value={startAt}
                                    onChange={(e) => setStartAt(e.target.value)}
                                    required
                                    disabled={isPending}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endAt">End Time (Optional)</Label>
                                <Input
                                    id="endAt"
                                    type="datetime-local"
                                    value={endAt}
                                    onChange={(e) => setEndAt(e.target.value)}
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
