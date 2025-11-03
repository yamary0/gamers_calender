import { notFound, redirect } from "next/navigation";
import { SessionDetailPanel } from "@/components/session-detail-panel";
import { getSession } from "@/services/session-store";
import { getGuildById } from "@/services/guild-store";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SessionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession(id);

  if (!session) {
    notFound();
  }

  if (!session.guildId) {
    return <SessionDetailPanel initialSession={session} />;
  }

  const guild = await getGuildById(session.guildId);

  if (!guild) {
    notFound();
  }

  redirect(`/g/${guild.slug}/sessions/${session.id}`);
}
