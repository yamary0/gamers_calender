'use client';

import { useCallback, useSyncExternalStore } from "react";

const matchesQuery = (query: string): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(query).matches;
};

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return () => {};
      }

      const mediaQuery = window.matchMedia(query);
      const handler = () => callback();

      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
      }

      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    },
    [query],
  );

  const getSnapshot = useCallback(() => matchesQuery(query), [query]);
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
