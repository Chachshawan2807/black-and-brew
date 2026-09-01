import type { AiSuggestionSchemaItem } from '@/lib/secretary/ai-suggestion-schema';
import {
  MAX_AI_SUGGESTIONS_PER_DAY,
  type AiSuggestionRawItem,
  type AiSuggestedTaskDraft,
} from '@/lib/secretary/ai-suggestion-types';
import {
  filterNonDuplicateSuggestions,
  hasMarkdownInSuggestionText,
} from '@/lib/secretary/dedupe-against-existing';
import { buildSourceRefHash } from '@/lib/secretary/source-ref-hash';
import type { SecretaryModule, SecretaryTask } from '@/lib/secretary/types';

const VALID_MODULES = new Set<SecretaryModule>([
  'schedule',
  'dashboard',
  'inventory',
  'inventory_count',
  'inventory_accuracy',
  'branch_withdraw',
  'bean_orders',
  'maintenance',
  'branch2',
  'custom',
]);

const VALID_PRIORITIES = new Set(['urgent', 'normal', 'low']);

const ALLOWED_ACTION_PREFIXES = [
  '/th/inventory',
  '/en/inventory',
  '/th/schedule',
  '/en/schedule',
  '/th/bean-orders',
  '/en/bean-orders',
  '/th/dashboard',
  '/en/dashboard',
  '/th/secretary',
  '/en/secretary',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

function readModule(value: unknown): SecretaryModule | null {
  if (typeof value !== 'string') return null;
  return VALID_MODULES.has(value as SecretaryModule) ? (value as SecretaryModule) : null;
}

function readPriority(value: unknown): AiSuggestionRawItem['priority'] | null {
  if (typeof value !== 'string' || !VALID_PRIORITIES.has(value)) return null;
  return value as AiSuggestionRawItem['priority'];
}

function readEstimatedMinutes(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  if (rounded < 5 || rounded > 480) return undefined;
  return rounded;
}

function readActionHref(value: unknown): string | undefined {
  const href = readString(value, 200);
  if (!href) return undefined;
  if (!ALLOWED_ACTION_PREFIXES.some((prefix) => href.startsWith(prefix))) return undefined;
  return href;
}

function hasThaiCharacters(text: string): boolean {
  return /[\u0E00-\u0E7F]/.test(text);
}

function stripMarkdownCodeFence(text: string): string {
  const trimmed = text.trim();
  const wholeFence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  if (wholeFence) return wholeFence[1].trim();

  const inlineFence = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed);
  if (inlineFence) return inlineFence[1].trim();

  return trimmed;
}

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** Best-effort JSON extraction from Gemini text; never throws. */
export function extractAiSuggestionPayload(text: string): unknown | null {
  const stripped = stripMarkdownCodeFence(text);
  const candidates = [stripped, text.trim()];

  for (const candidate of candidates) {
    const parsed = tryParseJson(candidate);
    if (parsed !== null) return parsed;
  }

  const objectMatch = /\{[\s\S]*\}/.exec(stripped);
  if (objectMatch) {
    const parsed = tryParseJson(objectMatch[0]);
    if (parsed !== null) return parsed;
  }

  return null;
}

function readSuggestionsArray(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (!isRecord(parsed)) return [];

  if (Array.isArray(parsed.suggestions)) return parsed.suggestions;
  if (Array.isArray(parsed.tasks)) return parsed.tasks;
  if (Array.isArray(parsed.items)) return parsed.items;

  return [];
}

export function parseAiSuggestionItem(value: unknown): AiSuggestionRawItem | null {
  if (!isRecord(value)) return null;

  const suggestionKey = readString(value.suggestionKey, 80);
  const title = readString(value.title, 200);
  const rationale = readString(value.rationale, 500);
  const module = readModule(value.module);
  const priority = readPriority(value.priority);

  if (!suggestionKey || !title || !rationale || !module || !priority) return null;
  if (!hasThaiCharacters(title) || !hasThaiCharacters(rationale)) return null;
  if (hasMarkdownInSuggestionText(title) || hasMarkdownInSuggestionText(rationale)) return null;

  const description = value.description ? readString(value.description, 1000) : undefined;
  if (description && hasMarkdownInSuggestionText(description)) return null;

  return {
    suggestionKey,
    title,
    description: description ?? undefined,
    module,
    priority,
    rationale,
    estimatedMinutes: readEstimatedMinutes(value.estimatedMinutes),
    actionHref: readActionHref(value.actionHref),
  };
}

export function parseAiSuggestionResponse(text: string): AiSuggestionRawItem[] {
  const parsed = extractAiSuggestionPayload(text);
  if (parsed === null) return [];

  const items: AiSuggestionRawItem[] = [];
  for (const entry of readSuggestionsArray(parsed)) {
    const item = parseAiSuggestionItem(entry);
    if (item) items.push(item);
  }
  return items;
}

export function rawSuggestionToDraft(item: AiSuggestionRawItem): AiSuggestedTaskDraft {
  const sourceRef = { suggestionKey: item.suggestionKey, rationale: item.rationale };
  return {
    taskType: 'custom',
    title: item.title,
    description: item.description,
    priority: item.priority,
    module: item.module,
    sourceRef,
    sourceRefHash: buildSourceRefHash('ai_suggested', sourceRef),
    actionHref: item.actionHref,
    estimatedMinutes: item.estimatedMinutes,
    metadata: {
      aiSuggested: true,
      rationale: item.rationale,
      confidence: item.priority === 'urgent' ? 'high' : 'medium',
    },
  };
}

export function resolveAiSuggestedDraftsFromSchemaItems(
  items: AiSuggestionSchemaItem[],
  existingTasks: SecretaryTask[],
  nowIso = new Date().toISOString(),
): AiSuggestedTaskDraft[] {
  const rawItems = items
    .map((item) => parseAiSuggestionItem(item))
    .filter((item): item is AiSuggestionRawItem => item !== null);
  return resolveAiSuggestedDrafts(rawItems, existingTasks, nowIso);
}

export function resolveAiSuggestedDrafts(
  rawItems: AiSuggestionRawItem[],
  existingTasks: SecretaryTask[],
  nowIso = new Date().toISOString(),
): AiSuggestedTaskDraft[] {
  const deduped = filterNonDuplicateSuggestions(rawItems, existingTasks, nowIso).slice(
    0,
    MAX_AI_SUGGESTIONS_PER_DAY,
  );
  return deduped.map(rawSuggestionToDraft);
}
