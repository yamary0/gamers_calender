import { notFound } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { describeSessionSchedule } from "@/lib/session-formatters";
import { getSession } from "@/services/session-store";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SessionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession(id);

  if (!session) {
    notFound();
  }

  const participantCount = `${session.participants.length}/${session.maxPlayers}`;
  const createdLabel = format(parseISO(session.createdAt), "MMM d, yyyy HH:mm");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">← Back to dashboard</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{session.title}</CardTitle>
          <CardDescription>Session overview and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-muted/40 px-3 py-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Status
              </p>
              <p className="text-base font-semibold text-foreground">
                {session.status}
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Participants
              </p>
              <p className="text-base font-semibold text-foreground">
                {participantCount}
              </p>
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/40 px-3 py-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Schedule
            </p>
            <p className="text-base font-semibold text-foreground">
              {describeSessionSchedule(session)}
            </p>
          </div>
          <div className="rounded-md border border-dashed border-border bg-muted/10 px-3 py-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Created
            </p>
            <p className="text-base font-semibold text-foreground">
              {createdLabel}
            </p>
            <p className="mt-1 text-xs text-muted-foreground break-words">
              ID: {session.id}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
          <CardDescription>
            Users attending this session (user IDs)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {session.participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No participants have joined yet.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {session.participants.map((participantId) => (
                <li
                  key={participantId}
                  className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground"
                >
                  {participantId}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
