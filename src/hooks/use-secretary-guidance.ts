'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildSecretaryGuidanceFingerprint } from '@/lib/secretary/guidance-fingerprint';
import { buildFallbackSecretaryGuidance } from '@/lib/secretary/guidance-fallback';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

const GUIDANCE_DEBOUNCE_MS = 900;

type GuidanceState = {
  text: string;
  fingerprint: string;
  loading: boolean;
};

export function useSecretaryGuidance(options: {
  tasks: SecretaryTask[];
  snapshot: SecretarySnapshot;
}) {
  const { tasks, snapshot } = options;
  const fingerprint = useMemo(
    () => buildSecretaryGuidanceFingerprint(tasks, snapshot),
    [tasks, snapshot],
  );

  const fallbackText = useMemo(
    () => buildFallbackSecretaryGuidance(tasks, snapshot),
    [tasks, snapshot],
  );

  const [state, setState] = useState<GuidanceState>(() => ({
    text: fallbackText,
    fingerprint,
    loading: true,
  }));

  const abortRef = useRef<AbortController | null>(null);
  const lastFetchedFingerprintRef = useRef<string | null>(null);

  useEffect(() => {
    if (fingerprint === lastFetchedFingerprintRef.current) {
      return;
    }

    setState({
      text: fallbackText,
      fingerprint,
      loading: true,
    });

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      void (async () => {
        try {
          const response = await fetch('/api/secretary/guidance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks, snapshot, fingerprint }),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`guidance ${response.status}`);
          }

          const json = (await response.json()) as {
            success?: boolean;
            text?: string;
            fingerprint?: string;
          };

          if (controller.signal.aborted) return;

          const nextFingerprint = json.fingerprint ?? fingerprint;
          lastFetchedFingerprintRef.current = nextFingerprint;
          setState({
            text: json.text?.trim() || fallbackText,
            fingerprint: nextFingerprint,
            loading: false,
          });
        } catch (error) {
          if (controller.signal.aborted) return;
          lastFetchedFingerprintRef.current = fingerprint;
          setState({
            text: fallbackText,
            fingerprint,
            loading: false,
          });
        }
      })();
    }, GUIDANCE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [fingerprint, tasks, snapshot, fallbackText]);

  return {
    text: state.text,
    loading: state.loading,
    fingerprint,
  };
}
