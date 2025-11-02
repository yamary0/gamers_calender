"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      router.replace("/");
      return;
    }

    const next = searchParams.get("next") ?? "/";
    const type = searchParams.get("type");
    const tokenHash = searchParams.get("token_hash");
    const code = searchParams.get("code");

    const handleExchange = async () => {
      try {
        if (type === "signup" && tokenHash) {
          await supabase.auth.verifyOtp({ type: "signup", token_hash: tokenHash });
        } else if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      } finally {
        router.replace(next);
      }
    };

    void handleExchange();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="rounded-lg border border-border bg-card px-6 py-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">
          Completing sign-in…
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You will be redirected automatically. If nothing happens, close this tab and return to the app.
        </p>
      </div>
    </div>
  );
}
