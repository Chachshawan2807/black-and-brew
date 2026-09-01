import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { applyAiSuggestedDrafts } from '@/lib/secretary/apply-ai-suggested-drafts';
import { aiSuggestionResponseSchema } from '@/lib/secretary/ai-suggestion-schema';
import { buildAiSuggestionFingerprint } from '@/lib/secretary/ai-suggestion-fingerprint';
import {
  buildAiSuggestionPrompt,
  SECRETARY_AI_SUGGESTION_SYSTEM,
} from '@/lib/secretary/ai-suggestion-prompt';
import { resolveAiSuggestedDraftsFromSchemaItems } from '@/lib/secretary/ai-suggestion-quality';
import type { AiSuggestedTaskDraft } from '@/lib/secretary/ai-suggestion-types';
import { hasCrossModuleSignal } from '@/lib/secretary/cross-module-signal';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

const suggestionCache = new Map<string, { drafts: AiSuggestedTaskDraft[]; at: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export type AiSuggestionSource = 'ai' | 'cache' | 'skipped';

export type GenerateAiSuggestionsResult = {
  drafts: AiSuggestedTaskDraft[];
  fingerprint: string;
  source: AiSuggestionSource;
};

function readCachedSuggestions(fingerprint: string): AiSuggestedTaskDraft[] | null {
  const cached = suggestionCache.get(fingerprint);
  if (!cached) return null;
  if (Date.now() - cached.at > CACHE_TTL_MS) {
    suggestionCache.delete(fingerprint);
    return null;
  }
  return cached.drafts;
}

function writeCachedSuggestions(fingerprint: string, drafts: AiSuggestedTaskDraft[]) {
  suggestionCache.set(fingerprint, { drafts, at: Date.now() });
}

export async function generateAiSuggestedTasks(input: {
  snapshot: SecretarySnapshot;
  existingTasks: SecretaryTask[];
  aiEnabled?: boolean;
}): Promise<GenerateAiSuggestionsResult> {
  const fingerprint = buildAiSuggestionFingerprint(input.snapshot, input.existingTasks);
  const aiEnabled = input.aiEnabled ?? true;

  if (!aiEnabled) {
    return { drafts: [], fingerprint, source: 'skipped' };
  }

  if (!hasCrossModuleSignal(input.snapshot, input.existingTasks)) {
    return { drafts: [], fingerprint, source: 'skipped' };
  }

  const cached = readCachedSuggestions(fingerprint);
  if (cached) {
    return { drafts: cached, fingerprint, source: 'cache' };
  }

  const apiKey =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return { drafts: [], fingerprint, source: 'skipped' };
  }

  try {
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: aiSuggestionResponseSchema,
      system: SECRETARY_AI_SUGGESTION_SYSTEM,
      prompt: buildAiSuggestionPrompt(input.snapshot, input.existingTasks),
    });

    const drafts = resolveAiSuggestedDraftsFromSchemaItems(
      object.suggestions,
      input.existingTasks,
    );
    writeCachedSuggestions(fingerprint, drafts);
    return { drafts, fingerprint, source: 'ai' };
  } catch (error) {
    console.error(
      'Secretary AI suggestion error:',
      error instanceof Error ? error.message : error,
    );
    return { drafts: [], fingerprint, source: 'skipped' };
  }
}

export async function syncAiSuggestedSecretaryTasks(opts: {
  snapshot: SecretarySnapshot;
  existingTasks?: SecretaryTask[];
  aiEnabled?: boolean;
}): Promise<{
  success: boolean;
  upserted?: number;
  autoSkipped?: number;
  source?: AiSuggestionSource;
  error?: string;
}> {
  const existingTasks = opts.existingTasks ?? [];
  const generated = await generateAiSuggestedTasks({
    snapshot: opts.snapshot,
    existingTasks,
    aiEnabled: opts.aiEnabled,
  });

  if (generated.drafts.length === 0) {
    const cleanup = await applyAiSuggestedDrafts([], opts.snapshot.dateIso, {
      boardTasks: existingTasks,
    });
    return {
      success: cleanup.success,
      upserted: 0,
      autoSkipped: cleanup.autoSkipped,
      source: generated.source,
      error: cleanup.error,
    };
  }

  const applied = await applyAiSuggestedDrafts(generated.drafts, opts.snapshot.dateIso, {
    boardTasks: existingTasks,
  });
  return {
    ...applied,
    source: generated.source,
  };
}
