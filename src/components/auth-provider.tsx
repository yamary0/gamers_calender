"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  signInWithDiscord: (redirectTo?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const noop = async () => {};

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
}

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(supabase));
  const [authError, setAuthError] = useState<string | null>(() =>
    supabase ? null : "Supabase client unavailable.",
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        setAuthError(error.message);
      } else {
        setAuthError(null);
      }

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      authError,
      signInWithDiscord: async (redirectTo?: string) => {
        if (!supabase) {
          setAuthError("Supabase client unavailable.");
          return;
        }

        const { error } = await supabase.auth.signInWithOAuth({
          provider: "discord",
          options: {
            redirectTo:
              redirectTo ??
              (typeof window !== "undefined"
                ? `${window.location.origin}/auth/callback`
                : undefined),
          },
        });

        if (error) {
          setAuthError(error.message);
        }
      },
      signInWithEmail: async (email: string, password: string) => {
        if (!supabase) {
          setAuthError("Supabase client unavailable.");
          return;
        }
        setAuthError(null);
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setAuthError(error.message);
        }
      },
      signUpWithEmail: async (email: string, password: string) => {
        if (!supabase) {
          setAuthError("Supabase client unavailable.");
          return;
        }
        setAuthError(null);
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/auth/callback`
                : undefined,
          },
        });
        if (error) {
          setAuthError(error.message);
        }
      },
      signOut: async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) {
          setAuthError(error.message);
        } else {
          setAuthError(null);
        }
      },
      refreshSession: async () => {
        if (!supabase) return;
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          setAuthError(error.message);
        } else {
          setSession(data.session ?? null);
          setUser(data.session?.user ?? null);
          setAuthError(null);
        }
      },
    }),
    [supabase, user, session, loading, authError],
  );

  if (!supabase) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          session: null,
          loading: false,
          authError:
            authError ?? "Supabase client unavailable. Check environment.",
          signInWithEmail: noop,
          signUpWithEmail: noop,
          signInWithDiscord: noop,
          signOut: noop,
          refreshSession: noop,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
