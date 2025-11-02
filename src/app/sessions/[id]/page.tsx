import { notFound } from "next/navigation";
import { SessionDetailPanel } from "@/components/session-detail-panel";
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

  return <SessionDetailPanel initialSession={session} />;
}
