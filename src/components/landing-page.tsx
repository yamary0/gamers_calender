"use client";

import { useMemo } from "react";
import Image from "next/image";
import {
  ArrowRight,
  CalendarClock,
  KanbanSquare,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";

const featureItems = [
  {
    title: "声をかけるハードルを下げる",
    description:
      "Aligna（アリーナ）が募集文や予定を整えてくれるから、「誘うほどでは…」という迷いをその場で解決できます。",
    icon: CalendarClock,
  },
  {
    title: "同じ温度感の仲間が見つかる",
    description:
      "「一人でやるほどではないけど、誰かやるなら参加したい」という気持ちが集まり、ちょうどいい人数が自然に揃います。",
    icon: UsersRound,
  },
  {
    title: "ゆるいつながりが続く",
    description:
      "気軽な参加・離脱を尊重しながら、次のセッションや盛り上がるタイミングをスムーズに共有できます。",
    icon: KanbanSquare,
  },
] as const;

export function LandingPage() {
  const { signInWithDiscord, loading, authError } = useAuth();

  const featureCards = useMemo(
    () =>
      featureItems.map(({ title, description, icon: Icon }) => (
        <Card
          key={title}
          className="border-[#1f2844] bg-[#10182d]/80 backdrop-blur px-0"
        >
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-full border border-[#2a3558] bg-[#1a2140]/80 text-foreground">
              <Icon className="size-6 text-[#8da2ff]" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="text-xs leading-relaxed text-foreground/70">
                {description}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )),
    [],
  );

  const handleDiscordSignIn = () => {
    void signInWithDiscord();
  };

  return (
    <div className="relative space-y-12 overflow-hidden rounded-3xl border border-[#1f2844] bg-gradient-to-b from-[#111a2f] via-[#111a2f] to-[#080e1a] p-10 text-foreground shadow-[0_40px_180px_-60px_rgba(83,99,224,0.8)]">
      <div className="pointer-events-none absolute -top-32 right-[-15%] size-[420px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.35),_rgba(17,24,39,0))] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-[-10%] size-[360px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.35),_rgba(8,14,26,0))] blur-3xl" />

      <section className="relative space-y-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#2a3558] bg-[#1a2140]/80 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#9ba8ff] backdrop-blur">
          <Sparkles className="size-4 text-[#9ba8ff]" aria-hidden="true" />
          気軽なマルチプレイを、もっと身近に
        </span>
        <div className="space-y-4">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Aligna（アリーナ）が「集まれたらいいな」を現実に変える。
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-foreground/70 sm:text-base">
            誘うほど大げさにはしたくない。でも、一人で黙々と遊ぶより、
            もし誰かが声をかけてくれるなら一緒に遊びたい。Aligna はそんな
            気持ちを持つプレイヤー同士をゆるやかにつなぎ、楽しみの火種を灯します。
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            size="lg"
            className="relative gap-2 rounded-full bg-[#5865f2] px-8 py-6 text-sm font-semibold text-white shadow-[0_20px_60px_-20px_rgba(88,101,242,0.8)] hover:bg-[#4752c4]"
            onClick={handleDiscordSignIn}
            disabled={loading}
          >
            <div className="flex flex-col items-start leading-tight">
              <span className="text-sm font-semibold">Aligna で集まって遊ぶ</span>
              <span className="mt-0.5 flex items-center gap-1 text-[11px] opacity-90">
                <Image
                  src="/Discord-Symbol-White.svg"
                  alt=""
                  width={14}
                  height={14}
                  className="h-3.5 w-3.5"
                />
                <span>Discordでサインイン</span>
              </span>
            </div>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
          <p className="text-xs text-foreground/60">
            やりたいタイトルと気分を共有するだけ。フラットな仲間と気軽にマッチできます。
          </p>
        </div>
        {authError ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            サインインに失敗しました: {authError}
          </p>
        ) : null}
      </section>

      <section className="relative grid gap-4 sm:grid-cols-2">
        {featureCards}
      </section>

      <section className="relative">
        <Card className="border-[#1f2844] bg-[#0c1426]/80 px-0 backdrop-blur">
          <CardHeader className="gap-4">
            <CardTitle className="text-xl">
              Aligna が生み出すつながり
            </CardTitle>
            <CardDescription className="text-xs text-foreground/70">
              いつものタイトルでも、新しいゲームでも。「誘うほどでは」「誰かやるなら」と思った瞬間に、
              同じ温度のプレイヤーと気軽につながり、遊ぶきっかけが生まれます。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pb-6 text-sm text-foreground/80 sm:grid-cols-3">
            <div className="rounded-lg border border-[#1f2844] bg-[#111a2f]/60 p-4 leading-relaxed">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8da2ff]">
                「誘うほどでは…」を拾い上げる
              </p>
              <p>
                予定や募集のテンプレが整っているから、気軽なひと声でも自然と人が集まります。
              </p>
            </div>
            <div className="rounded-lg border border-[#1f2844] bg-[#111a2f]/60 p-4 leading-relaxed">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8da2ff]">
                「誰かやるなら」を逃さない
              </p>
              <p>
                相性の良いメンバーへさりげなく通知。無理なく参加・不参加を選べます。
              </p>
            </div>
            <div className="rounded-lg border border-[#1f2844] bg-[#111a2f]/60 p-4 leading-relaxed">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8da2ff]">
                小さな楽しみを繰り返す
              </p>
              <p>
                セッションのたびに会話が生まれ、気軽なコミュニティが柔らかく育っていきます。
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
