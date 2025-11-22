"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
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

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export function UserMenu({ trigger, side = "bottom" }: { trigger?: React.ReactNode; side?: "top" | "bottom" }) {
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
    <>
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop for mobile and desktop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
                onClick={() => setOpen(false)}
                aria-hidden="true"
              />

              <motion.div
                drag={window.innerWidth < 768 ? "y" : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.2 }}
                onDragEnd={(_, info) => {
                  if (window.innerWidth >= 768) return;
                  if (info.offset.y > 100 || info.velocity.y > 500) {
                    setOpen(false);
                  }
                }}
                initial={window.innerWidth < 768 ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                animate={window.innerWidth < 768 ? { y: 0 } : { opacity: 1, scale: 1 }}
                exit={window.innerWidth < 768 ? { y: "100%" } : { opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className={cn(
                  // Common styles
                  "bg-popover shadow-lg",
                  // Mobile: Fixed Bottom Sheet
                  "fixed bottom-0 left-0 right-0 w-full rounded-t-xl p-4 pb-safe z-[70] border border-border",
                  // Desktop: Fixed Centered Modal
                  "md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[400px] md:rounded-xl md:bottom-auto md:border-0"
                )}
              >
                {/* Mobile Handle */}
                <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-muted md:hidden" />

                {loading ? (
                  <p className="text-xs text-muted-foreground">Loading session…</p>
                ) : user ? (
                  <div className="space-y-4 md:space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="relative size-12 overflow-hidden rounded-full border border-border bg-muted/60 md:size-10">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarUrl}
                            alt="User avatar"
                            className="size-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground md:text-xs">
                            {displayInitial}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground text-base md:text-sm">
                          {displayName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-4 md:pt-0 md:border-t-0">
                      <span className="text-sm text-muted-foreground md:text-xs">Signed in</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleSignOut}
                        disabled={isPending}
                        className="md:h-8"
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
                            className="flex-1"
                          >
                            Sign in
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={mode === "signUp" ? "default" : "outline"}
                            onClick={() => setMode("signUp")}
                            className="flex-1"
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
                      className="flex w-full items-center justify-center gap-2 bg-[#5865f2] text-white hover:bg-[#4752c4] h-10 md:h-9"
                      onClick={handleDiscordSignIn}
                      disabled={isPending}
                    >
                      <Image
                        src="/Discord-Symbol-White.svg"
                        alt=""
                        width={20}
                        height={20}
                        className="h-5 w-5 md:h-4 md:w-4"
                      />
                      <span>Sign in with Discord</span>
                    </Button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      <div className="relative" ref={menuRef}>
        {trigger ? (
          <div onClick={() => setOpen((c) => !c)} role="button" className="cursor-pointer">
            {trigger}
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            aria-label={user ? "Open user menu" : "Open authentication menu"}
            onClick={() => setOpen((current) => !current)}
            className="relative flex h-auto items-center gap-2 rounded-full border border-border bg-muted/60 pl-1.5 pr-3.5 py-1.5"
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
        )}
      </div>
    </>
  );
}
