'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { sortTasksByGlobalOrder } from '@/lib/secretary/apply-task-order';
import { buildSummaryGuidance } from '@/lib/secretary/guidance-fallback';
import { buildSecretaryGuidanceFingerprint } from '@/lib/secretary/guidance-fingerprint';
import { buildFallbackTaskOrder } from '@/lib/secretary/task-order-fallback';
import {
  MIN_TASKS_FOR_AI_ORDER,
  SECRETARY_TASK_ORDER_DEBOUNCE_MS,
  SECRETARY_TASK_ORDER_STABILITY_MS,
} from '@/lib/secretary/task-order-constants';
import type { SecretaryTaskOrderSource } from '@/lib/secretary/task-order-constants';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

const ORDER_DEBOUNCE_MS = SECRETARY_TASK_ORDER_DEBOUNCE_MS;
const STABILITY_WINDOW_MS = SECRETARY_TASK_ORDER_STABILITY_MS;

type GuidanceSource = 'ai' | 'fallback' | 'cache';

function idsKey(ids: string[]): string {
  return ids.join(',');
}

export function useSecretaryTaskOrder(options: {
  tasks: SecretaryTask[];
  snapshot: SecretarySnapshot;
  aiOrderingEnabled: boolean;
  /** Realtime light/scoped sync: use fallback guidance only, skip Gemini. */
  lightGuidanceOnly?: boolean;
}) {
  const { tasks, snapshot, aiOrderingEnabled, lightGuidanceOnly = false } = options;

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
  const fallbackIdsKey = idsKey(fallbackIds);

  const [orderedTaskIds, setOrderedTaskIds] = useState<string[]>(fallbackIds);
  const orderedTaskIdsKey = idsKey(orderedTaskIds);
  const [orderSource, setOrderSource] = useState<SecretaryTaskOrderSource>('fallback');
  const [orderLoading, setOrderLoading] = useState(false);

  const orderedForGuidance = useMemo(() => {
    const byId = new Map(fallbackOrdered.map((task) => [task.id, task]));
    const ordered = orderedTaskIds
      .map((id) => byId.get(id))
      .filter((task): task is SecretaryTask => task !== undefined);
    return ordered.length > 0 ? ordered : fallbackOrdered;
  }, [fallbackOrdered, orderedTaskIdsKey]);

  const syncSummaryGuidance = useMemo(
    () => buildSummaryGuidance(orderedForGuidance, snapshot),
    [orderedForGuidance, snapshot],
  );

  const [guidanceText, setGuidanceText] = useState(syncSummaryGuidance);
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [guidanceSource, setGuidanceSource] = useState<GuidanceSource>('fallback');

  const orderAbortRef = useRef<AbortController | null>(null);
  const guidanceAbortRef = useRef<AbortController | null>(null);
  const lastOrderFingerprintRef = useRef<string | null>(null);
  const lastGuidanceKeyRef = useRef<string | null>(null);
  const fallbackShownAtRef = useRef<number>(Date.now());
  const stabilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tasksRef = useRef(tasks);
  const snapshotRef = useRef(snapshot);
  const orderedTaskIdsRef = useRef(orderedTaskIds);
  const syncSummaryGuidanceRef = useRef(syncSummaryGuidance);

  tasksRef.current = tasks;
  snapshotRef.current = snapshot;
  orderedTaskIdsRef.current = orderedTaskIds;
  syncSummaryGuidanceRef.current = syncSummaryGuidance;

  useEffect(() => {
    setOrderedTaskIds((prev) => (idsKey(prev) === fallbackIdsKey ? prev : fallbackIds));
    setOrderSource('fallback');
  }, [fallbackIdsKey, fallbackIds]);

  useEffect(() => {
    setGuidanceText(syncSummaryGuidance);
    setGuidanceSource('fallback');
    lastGuidanceKeyRef.current = null;
  }, [syncSummaryGuidance]);

  useEffect(() => {
    const shouldFetchAiOrder =
      aiOrderingEnabled && fallbackOrdered.length >= MIN_TASKS_FOR_AI_ORDER;

    orderAbortRef.current?.abort();

    if (!shouldFetchAiOrder) {
      lastOrderFingerprintRef.current = null;
      setOrderLoading(false);
      return;
    }

    if (fingerprint === lastOrderFingerprintRef.current) {
      return;
    }

    setOrderLoading(true);
    const debounceTimer = setTimeout(() => {
      const controller = new AbortController();
      orderAbortRef.current = controller;

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
            orderedTaskIds?: string[];
            fingerprint?: string;
            source?: SecretaryTaskOrderSource;
          };

          if (controller.signal.aborted) return;

          const nextFingerprint = json.fingerprint ?? fingerprint;
          const nextIds = json.orderedTaskIds ?? fallbackIds;
          const nextSource = json.source ?? 'fallback';

          const applyOrder = () => {
            if (controller.signal.aborted) return;
            lastOrderFingerprintRef.current = nextFingerprint;
            setOrderedTaskIds(nextIds);
            setOrderSource(nextSource);
            setOrderLoading(false);
          };

          if (nextSource === 'fallback') {
            applyOrder();
            return;
          }

          const elapsed = Date.now() - fallbackShownAtRef.current;
          const remaining = Math.max(0, STABILITY_WINDOW_MS - elapsed);
          stabilityTimerRef.current = setTimeout(applyOrder, remaining);
        } catch {
          if (controller.signal.aborted) return;
          lastOrderFingerprintRef.current = fingerprint;
          setOrderedTaskIds(fallbackIds);
          setOrderSource('fallback');
          setOrderLoading(false);
        }
      })();
    }, ORDER_DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceTimer);
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current);
        stabilityTimerRef.current = null;
      }
      orderAbortRef.current?.abort();
    };
  }, [aiOrderingEnabled, fallbackIds, fallbackIdsKey, fallbackOrdered.length, fingerprint]);

  useEffect(() => {
    const guidanceKey = `${fingerprint}:${orderedTaskIdsKey}`;
    guidanceAbortRef.current?.abort();

    if (guidanceKey === lastGuidanceKeyRef.current) {
      return;
    }

    fallbackShownAtRef.current = Date.now();

    if (lightGuidanceOnly || !aiOrderingEnabled) {
      lastGuidanceKeyRef.current = guidanceKey;
      setGuidanceText(syncSummaryGuidanceRef.current);
      setGuidanceSource('fallback');
      setGuidanceLoading(false);
      return;
    }

    setGuidanceLoading(true);

    const debounceTimer = setTimeout(() => {
      const controller = new AbortController();
      guidanceAbortRef.current = controller;

      void (async () => {
        try {
          const response = await fetch('/api/secretary/guidance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tasks: tasksRef.current,
              snapshot: snapshotRef.current,
              fingerprint,
              orderedTaskIds: orderedTaskIdsRef.current,
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`guidance ${response.status}`);
          }

          const json = (await response.json()) as {
            text?: string;
            fingerprint?: string;
            source?: GuidanceSource;
          };

          if (controller.signal.aborted) return;

          lastGuidanceKeyRef.current = guidanceKey;
          setGuidanceText(json.text?.trim() || syncSummaryGuidanceRef.current);
          setGuidanceSource(json.source ?? 'fallback');
          setGuidanceLoading(false);
        } catch {
          if (controller.signal.aborted) return;
          lastGuidanceKeyRef.current = guidanceKey;
          setGuidanceText(syncSummaryGuidanceRef.current);
          setGuidanceSource('fallback');
          setGuidanceLoading(false);
        }
      })();
    }, ORDER_DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceTimer);
      guidanceAbortRef.current?.abort();
    };
  }, [aiOrderingEnabled, fingerprint, lightGuidanceOnly, orderedTaskIdsKey]);

  const sortTasks = useMemo(
    () => (items: SecretaryTask[]) => sortTasksByGlobalOrder(items, orderedTaskIds),
    [orderedTaskIds],
  );

  return {
    orderedTaskIds,
    guidanceText,
    loading: guidanceLoading || orderLoading,
    source: orderSource,
    guidanceSource,
    fingerprint,
    sortTasks,
  };
}
