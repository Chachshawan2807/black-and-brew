import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { z } from 'zod';
import { orderedTasksFromIds } from '@/lib/secretary/apply-task-order';
import { buildFallbackTaskOrder } from '@/lib/secretary/task-order-fallback';
import {
  buildSecretaryGuidanceFingerprint,
} from '@/lib/secretary/guidance-fingerprint';
import {
  buildSecretaryTaskOrderPrompt,
  SECRETARY_TASK_ORDER_SYSTEM,
} from '@/lib/secretary/task-order-prompt';
import {
  extractJsonObject,
  validateAiTaskOrder,
} from '@/lib/secretary/task-order-quality';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';
import type { SecretaryTaskOrderSource } from '@/lib/secretary/task-order-constants';

const taskOrderResponseSchema = z.object({
  orderedTaskIds: z.array(z.string().min(1)),
});

const orderCache = new Map<string, { orderedIds: string[]; at: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export type { SecretaryTaskOrderSource } from '@/lib/secretary/task-order-constants';

export type SecretaryTaskOrderResult = {
  orderedTaskIds: string[];
  orderedTasks: SecretaryTask[];
  fingerprint: string;
  source: SecretaryTaskOrderSource;
};

function readCachedOrder(fingerprint: string): string[] | null {
  const cached = orderCache.get(fingerprint);
  if (!cached) return null;
  if (Date.now() - cached.at > CACHE_TTL_MS) {
    orderCache.delete(fingerprint);
    return null;
  }
  return cached.orderedIds;
}

function writeCachedOrder(fingerprint: string, orderedIds: string[]) {
  orderCache.set(fingerprint, { orderedIds, at: Date.now() });
}

function buildFallbackResult(
  tasks: SecretaryTask[],
  snapshot: SecretarySnapshot,
  fingerprint: string,
  source: SecretaryTaskOrderSource,
  nowIso?: string,
): SecretaryTaskOrderResult {
  const orderedTasks = buildFallbackTaskOrder(tasks, nowIso);
  return {
    orderedTaskIds: orderedTasks.map((task) => task.id),
    orderedTasks,
    fingerprint,
    source,
  };
}

export async function generateSecretaryTaskOrder(input: {
  tasks: SecretaryTask[];
  snapshot: SecretarySnapshot;
  nowIso?: string;
}): Promise<SecretaryTaskOrderResult> {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const fingerprint = buildSecretaryGuidanceFingerprint(input.tasks, input.snapshot, nowIso);
  const actionable = buildFallbackTaskOrder(input.tasks, nowIso);

  if (actionable.length <= 1) {
    return buildFallbackResult(input.tasks, input.snapshot, fingerprint, 'fallback', nowIso);
  }

  const cached = readCachedOrder(fingerprint);
  if (cached && validateAiTaskOrder({ orderedIds: cached, actionableTasks: actionable })) {
    return {
      orderedTaskIds: cached,
      orderedTasks: orderedTasksFromIds(actionable, cached),
      fingerprint,
      source: 'cache',
    };
  }

  const fallback = buildFallbackResult(input.tasks, input.snapshot, fingerprint, 'fallback', nowIso);
  const apiKey =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    writeCachedOrder(fingerprint, fallback.orderedTaskIds);
    return fallback;
  }

  try {
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: SECRETARY_TASK_ORDER_SYSTEM,
      prompt: buildSecretaryTaskOrderPrompt(input.tasks, input.snapshot, undefined, nowIso),
      maxOutputTokens: 512,
    });

    const parsed = taskOrderResponseSchema.parse(extractJsonObject(text));
    if (!validateAiTaskOrder({ orderedIds: parsed.orderedTaskIds, actionableTasks: actionable })) {
      writeCachedOrder(fingerprint, fallback.orderedTaskIds);
      return fallback;
    }

    writeCachedOrder(fingerprint, parsed.orderedTaskIds);
    return {
      orderedTaskIds: parsed.orderedTaskIds,
      orderedTasks: orderedTasksFromIds(actionable, parsed.orderedTaskIds),
      fingerprint,
      source: 'ai',
    };
  } catch (error) {
    console.error(
      'Secretary task order AI error:',
      error instanceof Error ? error.message : error,
    );
    writeCachedOrder(fingerprint, fallback.orderedTaskIds);
    return fallback;
  }
}
