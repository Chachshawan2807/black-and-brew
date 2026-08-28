import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import {
  buildSecretaryGuidanceFingerprint,
  type SecretaryGuidanceSnapshotSlice,
} from '@/lib/secretary/guidance-fingerprint';
import { buildFallbackSecretaryGuidance } from '@/lib/secretary/guidance-fallback';
import {
  buildSecretaryGuidancePrompt,
  SECRETARY_GUIDANCE_SYSTEM,
} from '@/lib/secretary/guidance-prompt';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

import { resolveGuidanceText } from '@/lib/secretary/guidance-quality';

const guidanceCache = new Map<string, { text: string; at: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function readCachedGuidance(fingerprint: string): string | null {
  const cached = guidanceCache.get(fingerprint);
  if (!cached) return null;
  if (Date.now() - cached.at > CACHE_TTL_MS) {
    guidanceCache.delete(fingerprint);
    return null;
  }
  return cached.text;
}

function writeCachedGuidance(fingerprint: string, text: string) {
  guidanceCache.set(fingerprint, { text, at: Date.now() });
}

export type SecretaryGuidanceResult = {
  text: string;
  fingerprint: string;
  source: 'ai' | 'fallback' | 'cache';
};

export async function generateSecretaryGuidance(input: {
  tasks: SecretaryTask[];
  snapshot: SecretarySnapshot;
}): Promise<SecretaryGuidanceResult> {
  const fingerprint = buildSecretaryGuidanceFingerprint(input.tasks, input.snapshot);
  const cached = readCachedGuidance(fingerprint);
  if (cached) {
    return { text: cached, fingerprint, source: 'cache' };
  }

  const fallback = buildFallbackSecretaryGuidance(input.tasks, input.snapshot);
  const actionableCount = input.tasks.filter(
    (task) => task.status === 'pending' || task.status === 'in_progress',
  ).length;
  const apiKey =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    writeCachedGuidance(fingerprint, fallback);
    return { text: fallback, fingerprint, source: 'fallback' };
  }

  try {
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: SECRETARY_GUIDANCE_SYSTEM,
      prompt: buildSecretaryGuidancePrompt(input.tasks, input.snapshot),
      maxOutputTokens: 256,
    });

    const resolved = resolveGuidanceText(text, fallback, actionableCount);
    writeCachedGuidance(fingerprint, resolved);
    return {
      text: resolved,
      fingerprint,
      source: resolved === fallback ? 'fallback' : 'ai',
    };
  } catch (error) {
    console.error(
      'Secretary guidance AI error:',
      error instanceof Error ? error.message : error,
    );
    writeCachedGuidance(fingerprint, fallback);
    return { text: fallback, fingerprint, source: 'fallback' };
  }
}

export function buildGuidanceSnapshotSlice(
  snapshot: SecretarySnapshot,
): SecretaryGuidanceSnapshotSlice {
  return {
    dateIso: snapshot.dateIso,
    isBranch2Day: snapshot.isBranch2Day,
    headcountToday: snapshot.headcountToday,
    itemsToOrder: snapshot.itemsToOrder,
    branchWithdrawItems: snapshot.branchWithdrawItems,
    maintenanceTasks: snapshot.maintenanceTasks,
  };
}
