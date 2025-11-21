import { cn } from "@/lib/utils";
import type { SessionParticipant } from "@/services/session-store";

type AvatarStackProps = {
    participants: SessionParticipant[];
    maxAvatars?: number;
    className?: string;
    size?: "sm" | "md" | "lg";
};

export function AvatarStack({
    participants,
    maxAvatars = 5,
    className,
    size = "sm",
}: AvatarStackProps) {
    const displayParticipants = participants.slice(0, maxAvatars);
    const remainingCount = Math.max(0, participants.length - maxAvatars);

    const sizeClasses = {
        sm: "h-7 w-7 text-[10px]",
        md: "h-10 w-10 text-xs",
        lg: "h-12 w-12 text-sm",
    };

    const ringClasses = "ring-2 ring-background";

    return (
        <div className={cn("flex items-center -space-x-2 overflow-hidden", className)}>
            {displayParticipants.map((p) => (
                <div
                    key={p.id}
                    className={cn(
                        "relative flex items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-muted-foreground",
                        sizeClasses[size],
                        ringClasses
                    )}
                    title={p.displayName ?? "User"}
                >
                    {p.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={p.avatarUrl}
                            alt={p.displayName ?? "User"}
                            className="h-full w-full rounded-full object-cover"
                        />
                    ) : (
                        (p.displayName?.[0] ?? "?").toUpperCase()
                    )}
                </div>
            ))}
            {remainingCount > 0 && (
                <div
                    className={cn(
                        "relative flex items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-muted-foreground",
                        sizeClasses[size],
                        ringClasses
                    )}
                >
                    +{remainingCount}
                </div>
            )}
            {participants.length === 0 && (
                <span className="text-xs text-muted-foreground/50 italic">
                    No participants
                </span>
            )}
        </div>
    );
}
