'use client';

import { useMemo } from 'react';
import { buildSecretaryGuidanceFingerprint } from '@/lib/secretary/guidance-fingerprint';
import { buildFallbackSecretaryGuidance } from '@/lib/secretary/guidance-fallback';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

export function useSecretaryGuidance(options: {
  tasks: SecretaryTask[];
  snapshot: SecretarySnapshot;
}) {
  const { tasks, snapshot } = options;

  const fingerprint = useMemo(
    () => buildSecretaryGuidanceFingerprint(tasks, snapshot),
    [tasks, snapshot],
  );

  const text = useMemo(
    () => buildFallbackSecretaryGuidance(tasks, snapshot),
    [tasks, snapshot],
  );

  return {
    text,
    loading: false,
    fingerprint,
  };
}
