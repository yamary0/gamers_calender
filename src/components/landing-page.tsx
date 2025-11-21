"use client";

import { useMemo } from "react";
import Image from "next/image";
import {
  ArrowRight,
  CalendarClock,
  KanbanSquare,
  Sparkles,
  UsersRound,
  Zap,
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
          className="group relative overflow-hidden border-border/50 bg-card/60 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
          <CardHeader className="relative flex flex-row items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/50 text-foreground shadow-sm transition-all group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:shadow-md group-hover:shadow-primary/20">
              <Icon className="size-6 text-primary transition-transform group-hover:scale-110" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-base font-semibold leading-tight">{title}</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
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
    <div className="relative space-y-16 overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-card via-background to-card/50 p-6 shadow-2xl shadow-primary/10 md:p-12">
      {/* Enhanced gradient orbs */}
      <div className="pointer-events-none absolute -top-40 right-[-20%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(88,101,242,0.15),_transparent_70%)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-[-15%] h-[450px] w-[450px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(139,154,252,0.12),_transparent_70%)] blur-3xl" />
      <div className="pointer-events-none absolute right-[10%] top-[40%] h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(88,101,242,0.08),_transparent_70%)] blur-3xl" />

      {/* Hero Section */}
      <section className="relative space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-medium uppercase tracking-wider text-primary shadow-sm backdrop-blur-sm">
          <Sparkles className="size-4" aria-hidden="true" />
          気軽なマルチプレイを、もっと身近に
        </div>

        <div className="space-y-6">
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl md:text-6xl">
            <span className="bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
              Aligna が
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              「集まれたらいいな」
            </span>
            <br />
            <span className="bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
              を現実に変える
            </span>
          </h1>

          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            誘うほど大げさにはしたくない。でも、一人で黙々と遊ぶより、
            もし誰かが声をかけてくれるなら一緒に遊びたい。
            <span className="font-medium text-foreground"> Aligna </span>
            はそんな気持ちを持つプレイヤー同士をゆるやかにつなぎ、楽しみの火種を灯します。
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Button
            type="button"
            size="lg"
            className="group relative overflow-hidden rounded-xl bg-primary px-8 py-7 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] hover:bg-primary/90 hover:shadow-2xl hover:shadow-primary/40 active:scale-[0.98]"
            onClick={handleDiscordSignIn}
            disabled={loading}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-center gap-3">
              <div className="flex flex-col items-start leading-tight">
                <span className="text-sm font-bold">Aligna で集まって遊ぶ</span>
                <span className="mt-1 flex items-center gap-1.5 text-[11px] opacity-90">
                  <Image
                    src="/Discord-Symbol-White.svg"
                    alt=""
                    width={14}
                    height={14}
                    className="h-3.5 w-3.5"
                  />
                  <span>Discord でサインイン</span>
                </span>
              </div>
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </div>
          </Button>

          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="size-4 text-primary" />
              やりたいタイトルと気分を共有するだけ
            </p>
            <p className="text-xs text-muted-foreground/70">
              フラットな仲間と気軽にマッチできます
            </p>
          </div>
        </div>

        {authError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive backdrop-blur-sm">
            <p className="font-medium">サインインに失敗しました</p>
            <p className="mt-1 text-xs opacity-90">{authError}</p>
          </div>
        ) : null}
      </section>

      {/* Feature Cards */}
      <section className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featureCards}
      </section>

      {/* Value Proposition Section */}
      <section className="relative">
        <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-card/80 to-muted/30 backdrop-blur-sm">
          <CardHeader className="space-y-3 pb-6">
            <CardTitle className="text-2xl font-bold">
              Aligna が生み出すつながり
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              いつものタイトルでも、新しいゲームでも。「誘うほどでは」「誰かやるなら」と思った瞬間に、
              同じ温度のプレイヤーと気軽につながり、遊ぶきっかけが生まれます。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pb-8 sm:grid-cols-3">
            <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-muted/30 p-5 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-muted/50">
              <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
              <p className="relative mb-3 text-xs font-bold uppercase tracking-wider text-primary">
                「誘うほどでは…」を拾い上げる
              </p>
              <p className="relative text-sm leading-relaxed text-foreground/80">
                予定や募集のテンプレが整っているから、気軽なひと声でも自然と人が集まります。
              </p>
            </div>
            <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-muted/30 p-5 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-muted/50">
              <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
              <p className="relative mb-3 text-xs font-bold uppercase tracking-wider text-primary">
                「誰かやるなら」を逃さない
              </p>
              <p className="relative text-sm leading-relaxed text-foreground/80">
                相性の良いメンバーへさりげなく通知。無理なく参加・不参加を選べます。
              </p>
            </div>
            <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-muted/30 p-5 backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-muted/50">
              <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
              <p className="relative mb-3 text-xs font-bold uppercase tracking-wider text-primary">
                小さな楽しみを繰り返す
              </p>
              <p className="relative text-sm leading-relaxed text-foreground/80">
                セッションのたびに会話が生まれ、気軽なコミュニティが柔らかく育っていきます。
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

