'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { sortTasksByGlobalOrder } from '@/lib/secretary/apply-task-order';
import { buildFallbackTaskOrder } from '@/lib/secretary/task-order-fallback';
import { buildSecretaryGuidanceFromOrderedTasks } from '@/lib/secretary/guidance-fallback';
import { buildSecretaryGuidanceFingerprint } from '@/lib/secretary/guidance-fingerprint';
import {
  MIN_TASKS_FOR_AI_ORDER,
  SECRETARY_TASK_ORDER_DEBOUNCE_MS,
  SECRETARY_TASK_ORDER_STABILITY_MS,
} from '@/lib/secretary/task-order-constants';
import type { SecretaryTaskOrderSource } from '@/lib/secretary/task-order-constants';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

const ORDER_DEBOUNCE_MS = SECRETARY_TASK_ORDER_DEBOUNCE_MS;
const STABILITY_WINDOW_MS = SECRETARY_TASK_ORDER_STABILITY_MS;

type TaskOrderState = {
  orderedTaskIds: string[];
  guidanceText: string;
  fingerprint: string;
  source: SecretaryTaskOrderSource;
  loading: boolean;
};

export function useSecretaryTaskOrder(options: {
  tasks: SecretaryTask[];
  snapshot: SecretarySnapshot;
  aiOrderingEnabled: boolean;
}) {
  const { tasks, snapshot, aiOrderingEnabled } = options;

  const fingerprint = useMemo(
    () => buildSecretaryGuidanceFingerprint(tasks, snapshot),
    [tasks, snapshot],
  );

  const fallbackOrdered = useMemo(
    () => buildFallbackTaskOrder(tasks, undefined, { isBranch2Day: snapshot.isBranch2Day }),
    [tasks, snapshot.isBranch2Day],
  );

  const fallbackIds = useMemo(
    () => fallbackOrdered.map((task) => task.id),
    [fallbackOrdered],
  );

  const fallbackGuidance = useMemo(
    () => buildSecretaryGuidanceFromOrderedTasks(fallbackOrdered, snapshot),
    [fallbackOrdered, snapshot],
  );

  const [state, setState] = useState<TaskOrderState>(() => ({
    orderedTaskIds: fallbackIds,
    guidanceText: fallbackGuidance,
    fingerprint,
    source: 'fallback',
    loading: false,
  }));

  const abortRef = useRef<AbortController | null>(null);
  const lastFetchedFingerprintRef = useRef<string | null>(null);
  const fallbackShownAtRef = useRef<number>(Date.now());
  const stabilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tasksRef = useRef(tasks);
  const snapshotRef = useRef(snapshot);

  tasksRef.current = tasks;
  snapshotRef.current = snapshot;

  useEffect(() => {
    if (stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current);
      stabilityTimerRef.current = null;
    }
    abortRef.current?.abort();

    const shouldFetchAi =
      aiOrderingEnabled && fallbackOrdered.length >= MIN_TASKS_FOR_AI_ORDER;

    if (!shouldFetchAi) {
      lastFetchedFingerprintRef.current = null;
      setState((prev) => {
        if (
          prev.fingerprint === fingerprint &&
          prev.source === 'fallback' &&
          !prev.loading &&
          prev.orderedTaskIds.length === fallbackIds.length &&
          prev.orderedTaskIds.every((id, index) => id === fallbackIds[index])
        ) {
          return prev;
        }
        return {
          orderedTaskIds: fallbackIds,
          guidanceText: fallbackGuidance,
          fingerprint,
          source: 'fallback',
          loading: false,
        };
      });
      return;
    }

    if (fingerprint === lastFetchedFingerprintRef.current) {
      return;
    }

    fallbackShownAtRef.current = Date.now();
    setState({
      orderedTaskIds: fallbackIds,
      guidanceText: fallbackGuidance,
      fingerprint,
      source: 'fallback',
      loading: true,
    });

    const debounceTimer = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      void (async () => {
        try {
          const response = await fetch('/api/secretary/task-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tasks: tasksRef.current,
              snapshot: snapshotRef.current,
              fingerprint,
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`task-order ${response.status}`);
          }

          const json = (await response.json()) as {
            success?: boolean;
            orderedTaskIds?: string[];
            guidanceText?: string;
            fingerprint?: string;
            source?: SecretaryTaskOrderSource;
          };

          if (controller.signal.aborted) return;

          const nextFingerprint = json.fingerprint ?? fingerprint;
          const nextIds = json.orderedTaskIds ?? fallbackIds;
          const nextGuidance = json.guidanceText?.trim() || fallbackGuidance;
          const nextSource = json.source ?? 'fallback';

          const applyAiOrder = () => {
            if (controller.signal.aborted) return;
            lastFetchedFingerprintRef.current = nextFingerprint;
            setState({
              orderedTaskIds: nextIds,
              guidanceText: nextGuidance,
              fingerprint: nextFingerprint,
              source: nextSource,
              loading: false,
            });
          };

          if (nextSource === 'fallback') {
            applyAiOrder();
            return;
          }

          const elapsed = Date.now() - fallbackShownAtRef.current;
          const remaining = Math.max(0, STABILITY_WINDOW_MS - elapsed);
          stabilityTimerRef.current = setTimeout(applyAiOrder, remaining);
        } catch (error) {
          if (controller.signal.aborted) return;
          lastFetchedFingerprintRef.current = fingerprint;
          setState({
            orderedTaskIds: fallbackIds,
            guidanceText: fallbackGuidance,
            fingerprint,
            source: 'fallback',
            loading: false,
          });
        }
      })();
    }, ORDER_DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceTimer);
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current);
        stabilityTimerRef.current = null;
      }
      abortRef.current?.abort();
    };
  }, [
    aiOrderingEnabled,
    fallbackGuidance,
    fallbackIds,
    fallbackOrdered.length,
    fingerprint,
  ]);

  const sortTasks = useMemo(
    () => (items: SecretaryTask[]) => sortTasksByGlobalOrder(items, state.orderedTaskIds),
    [state.orderedTaskIds],
  );

  return {
    orderedTaskIds: state.orderedTaskIds,
    guidanceText: state.guidanceText,
    loading: state.loading,
    source: state.source,
    fingerprint,
    sortTasks,
  };
}
