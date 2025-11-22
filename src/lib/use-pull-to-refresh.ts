import { useCallback, useMemo, useRef, useState } from 'react';
import type { TouchEvent } from 'react';

type PullToRefreshOptions = {
  enabled?: boolean;
  threshold?: number;
  maxDistance?: number;
  onRefresh: () => Promise<void> | void;
};

type PullToRefreshHandlers = {
  onTouchStart: (event: TouchEvent) => void;
  onTouchMove: (event: TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
};

type PullToRefreshResult = {
  distance: number;
  progress: number;
  threshold: number;
  isRefreshing: boolean;
  handlers: PullToRefreshHandlers;
};

const DEFAULT_THRESHOLD = 72;
const DEFAULT_MAX_DISTANCE = 140;

export function usePullToRefresh({
  enabled = true,
  threshold = DEFAULT_THRESHOLD,
  maxDistance = DEFAULT_MAX_DISTANCE,
  onRefresh,
}: PullToRefreshOptions): PullToRefreshResult {
  const [distance, setDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const resetTouchState = useCallback(() => {
    startYRef.current = null;
    isDraggingRef.current = false;
    setDistance(0);
  }, []);

  const isAtTop = () => {
    if (typeof window === 'undefined') return false;
    return window.scrollY <= 0;
  };

  const beginRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.resolve(onRefresh());
    } finally {
      setDistance(0);
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (!enabled || isRefreshing) return;
      if (!isAtTop()) return;

      startYRef.current = event.touches[0]?.clientY ?? null;
      isDraggingRef.current = startYRef.current !== null;
    },
    [enabled, isRefreshing],
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!enabled || !isDraggingRef.current || startYRef.current === null || isRefreshing) {
        return;
      }

      const currentY = event.touches[0]?.clientY ?? 0;
      const delta = currentY - startYRef.current;

      if (delta <= 0) {
        setDistance(0);
        return;
      }

      if (!isAtTop()) {
        resetTouchState();
        return;
      }

      setDistance(Math.min(delta, maxDistance));
    },
    [enabled, isRefreshing, maxDistance, resetTouchState],
  );

  const finishPull = useCallback(() => {
    if (!enabled || !isDraggingRef.current) {
      return;
    }

    const shouldRefresh = distance >= threshold;
    resetTouchState();

    if (shouldRefresh) {
      void beginRefresh();
    }
  }, [beginRefresh, distance, enabled, resetTouchState, threshold]);

  const handlers = useMemo(
    () => ({
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: finishPull,
      onTouchCancel: finishPull,
    }),
    [finishPull, handleTouchMove, handleTouchStart],
  );

  const progress = Math.min(1, distance / threshold);

  return {
    distance,
    progress,
    threshold,
    isRefreshing,
    handlers,
  };
}
