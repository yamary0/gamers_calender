import type { Metadata } from "next";
import { GuildScreen } from "@/app/g/[slug]/guild-screen";

type GuildPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: GuildPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} · Aligna`,
    description: "ギルド向けのセッション管理ビュー。",
  };
}

export default async function GuildPage({ params }: GuildPageProps) {
  const { slug } = await params;
  return <GuildScreen slug={slug} />;
}
