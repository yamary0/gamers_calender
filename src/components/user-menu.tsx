"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/components/auth-provider";
import { ErrorToast } from "@/components/error-toast";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const EMAIL_AUTH_ENABLED = false;

const getAvatarUrl = (user: User | null): string | null => {
  const candidate = user?.user_metadata?.avatar_url;
  return typeof candidate === "string" ? candidate : null;
};

const getDisplayInitial = (value: string | null | undefined) => {
  if (!value) {
    return "?";
  }
  return value.trim().charAt(0).toUpperCase();
};

export function UserMenu() {
  const {
    user,
    loading,
    authError,
    signInWithEmail,
    signUpWithEmail,
    signInWithDiscord,
    signOut,
    refreshSession,
  } = useAuth();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const avatarUrl = getAvatarUrl(user);
  const displayInitial = getDisplayInitial(
    typeof user?.user_metadata?.name === "string"
      ? (user.user_metadata.name as string)
      : user?.id ?? null,
  );

  const displayName = user
    ? typeof user.user_metadata?.name === "string"
      ? (user.user_metadata.name as string)
      : typeof user.email === "string"
        ? user.email.split("@")[0]
        : user.id
    : "Sign in";

  const handleAuthSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    setLocalError(null);
    setFeedback(null);

    if (!email || !password) {
      setLocalError("Email and password are required.");
      return;
    }

    startTransition(async () => {
      if (mode === "signIn") {
        await signInWithEmail(email, password);
        await refreshSession();
        setOpen(false);
        router.refresh();
      } else {
        await signUpWithEmail(email, password);
        setFeedback("Sign up successful. Check your inbox to confirm the account.");
      }
    });
  };

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut();
      await refreshSession();
      setOpen(false);
      router.refresh();
    });
  };

  const handleDiscordSignIn = () => {
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
    void signInWithDiscord(redirectTo);
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        aria-label={user ? "Open user menu" : "Open authentication menu"}
        onClick={() => setOpen((current) => !current)}
        className="relative flex items-center gap-2 rounded-full border border-border bg-muted/60 pl-1.5 pr-3.5 py-5"
      >
        <span className="flex size-8 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-xs font-semibold text-muted-foreground">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="User avatar"
              className="size-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            displayInitial
          )}
        </span>
        <span className="text-xs font-medium text-foreground">
          {displayName}
        </span>
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-md border border-border bg-popover p-4 text-sm shadow-lg">
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading session…</p>
          ) : user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative size-10 overflow-hidden rounded-full border border-border bg-muted/60">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt="User avatar"
                      className="size-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                      {displayInitial}
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">
                    {user.email ?? user.id}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {user.id}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Signed in</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSignOut}
                  disabled={isPending}
                >
                  Sign out
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {EMAIL_AUTH_ENABLED ? (
                <>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={mode === "signIn" ? "default" : "outline"}
                      onClick={() => setMode("signIn")}
                    >
                      Sign in
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={mode === "signUp" ? "default" : "outline"}
                      onClick={() => setMode("signUp")}
                    >
                      Sign up
                    </Button>
                  </div>
                  <form className="space-y-3" onSubmit={handleAuthSubmit}>
                    <div className="flex flex-col gap-1.5">
                      <label
                        className="text-xs font-medium text-muted-foreground"
                        htmlFor="menu-email"
                      >
                        Email
                      </label>
                      <input
                        id="menu-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        className="text-xs font-medium text-muted-foreground"
                        htmlFor="menu-password"
                      >
                        Password
                      </label>
                      <input
                        id="menu-password"
                        type="password"
                        required
                        minLength={6}
                        autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        placeholder="At least 6 characters"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isPending}>
                      {mode === "signIn" ? "Sign in" : "Create account"}
                    </Button>
                    {localError && <ErrorToast message={localError} />}
                    {authError && <ErrorToast message={authError} />}
                    {feedback && (
                      <p className="text-xs text-muted-foreground">{feedback}</p>
                    )}
                  </form>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Email sign-in is temporarily unavailable. Use Discord instead.
                </p>
              )}
              <Button
                type="button"
                size="sm"
                className="flex w-full items-center justify-center gap-2 bg-[#5865f2] text-white hover:bg-[#4752c4]"
                onClick={handleDiscordSignIn}
                disabled={isPending}
              >
                <Image
                  src="/Discord-Symbol-White.svg"
                  alt=""
                  width={18}
                  height={18}
                  className="h-4 w-4"
                />
                <span>Sign in with Discord</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
