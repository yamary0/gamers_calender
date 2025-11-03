"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export type GuildSummary = {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "member";
};

type GuildContextValue = {
  guilds: GuildSummary[];
  selectedGuildId: string | null;
  loading: boolean;
  error: string | null;
  refreshGuilds: () => Promise<void>;
  selectGuild: (guildId: string) => void;
  createGuild: (name: string) => Promise<GuildSummary>;
};

const GuildContext = createContext<GuildContextValue | undefined>(undefined);

export function useGuilds() {
  const context = useContext(GuildContext);
  if (!context) {
    throw new Error("useGuilds must be used within a GuildProvider");
  }
  return context;
}

type GuildProviderProps = {
  children: React.ReactNode;
};

export function GuildProvider({ children }: GuildProviderProps) {
  const { user, session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [guilds, setGuilds] = useState<GuildSummary[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const accessToken = session?.access_token ?? null;

  const loadGuilds = useCallback(async () => {
    if (!user || !accessToken) {
      setGuilds([]);
      setSelectedGuildId(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/guilds", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? `HTTP ${response.status}`);
      }

      const payload = (await response.json()) as { data: GuildSummary[] };
      setGuilds(payload.data);
      if (payload.data.length === 0) {
        setSelectedGuildId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load guilds");
      setGuilds([]);
      setSelectedGuildId(null);
    } finally {
      setLoading(false);
    }
  }, [user, accessToken]);

  useEffect(() => {
    void loadGuilds();
  }, [loadGuilds]);

  useEffect(() => {
    if (guilds.length === 0) {
      return;
    }

    if (pathname && pathname.startsWith("/g/")) {
      const [, , maybeSlug] = pathname.split("/");
      if (maybeSlug) {
        const matched = guilds.find((guild) => guild.slug === maybeSlug);
        if (matched) {
          setSelectedGuildId(matched.id);
          return;
        }
      }
    }

    setSelectedGuildId((current) => current ?? guilds[0]?.id ?? null);
  }, [guilds, pathname]);

  const refreshGuilds = useCallback(async () => {
    await loadGuilds();
  }, [loadGuilds]);

  const selectGuild = useCallback((guildId: string) => {
    setSelectedGuildId(guildId);
  }, []);

  const createGuild = useCallback(
    async (name: string) => {
      if (!user || !accessToken) {
        throw new Error("Authentication required.");
      }

      const response = await fetch("/api/guilds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { data?: GuildSummary; error?: string }
        | null;

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error ?? "Failed to create guild");
      }

      const { data } = payload;

      setGuilds((prev) => [...prev, data]);
      setSelectedGuildId(data.id);
      startTransition(() => {
        router.push(`/g/${data.slug}`);
      });
      return data;
    },
    [user, accessToken, router, startTransition],
  );

  const value = useMemo<GuildContextValue>(
    () => ({
      guilds,
      selectedGuildId,
      loading: loading || isPending,
      error,
      refreshGuilds,
      selectGuild,
      createGuild,
    }),
    [
      guilds,
      selectedGuildId,
      loading,
      isPending,
      error,
      refreshGuilds,
      selectGuild,
      createGuild,
    ],
  );

  return <GuildContext.Provider value={value}>{children}</GuildContext.Provider>;
}
