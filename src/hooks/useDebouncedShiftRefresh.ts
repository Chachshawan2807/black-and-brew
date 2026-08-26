'use client';

import { useCallback, useEffect, useRef } from 'react';

const DEFAULT_DEBOUNCE_MS = 300;

interface UseDebouncedShiftRefreshOptions {
  debounceMs?: number;
  onRefresh: (options?: { force?: boolean }) => void | Promise<void>;
}

/**
 * Coordinates shift refetches so realtime DELETE/INSERT pairs and in-flight saves
 * do not overwrite optimistic UI with stale reads.
 */
export function useDebouncedShiftRefresh({
  debounceMs = DEFAULT_DEBOUNCE_MS,
  onRefresh,
}: UseDebouncedShiftRefreshOptions) {
  const pendingMutationsRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const runRefresh = useCallback((options?: { force?: boolean }) => {
    if (!options?.force && pendingMutationsRef.current > 0) {
      return;
    }
    void onRefreshRef.current(options);
  }, []);

  const scheduleRefresh = useCallback(
    (options?: { force?: boolean }) => {
      if (options?.force) {
        clearDebounce();
        runRefresh({ force: true });
        return;
      }

      if (pendingMutationsRef.current > 0) {
        return;
      }

      clearDebounce();
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        runRefresh();
      }, debounceMs);
    },
    [clearDebounce, debounceMs, runRefresh],
  );

  const beginShiftMutation = useCallback(() => {
    pendingMutationsRef.current += 1;
    clearDebounce();
  }, [clearDebounce]);

  const endShiftMutation = useCallback(() => {
    pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
  }, []);

  useEffect(() => clearDebounce, [clearDebounce]);

  return {
    beginShiftMutation,
    endShiftMutation,
    scheduleRefresh,
    runRefresh,
  };
}
