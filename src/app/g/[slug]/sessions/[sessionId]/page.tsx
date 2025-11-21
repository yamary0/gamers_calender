import { notFound } from "next/navigation";
import { SessionDetailPanel } from "@/components/session-detail-panel";
import { getGuildBySlug } from "@/services/guild-store";
import { getSession } from "@/services/session-store";

type PageProps = {
  params: Promise<{ slug: string; sessionId: string }>;
};

export default async function GuildSessionDetailPage({ params }: PageProps) {
  const { slug, sessionId } = await params;

  const guild = await getGuildBySlug(slug);
  if (!guild) {
    notFound();
  }

  const session = await getSession(sessionId);
  if (!session || session.guildId !== guild.id) {
    notFound();
  }

  return <SessionDetailPanel initialSession={session} backHref="/" />;
}
