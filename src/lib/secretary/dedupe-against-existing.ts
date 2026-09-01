import { MODULE_DERIVED_TASK_TYPES } from '@/lib/secretary/ai-suggestion-types';
import type { AiSuggestionRawItem } from '@/lib/secretary/ai-suggestion-types';
import type { SecretaryTask } from '@/lib/secretary/types';

const MARKDOWN_PATTERN = /```|#{1,6}\s|(^|\n)\s*[-*•]\s/;

export function normalizeSuggestionTitle(title: string): string {
  return title
    .replace(/["'「」]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function isActionableExistingTask(task: SecretaryTask, nowIso: string): boolean {
  if (task.status !== 'pending' && task.status !== 'in_progress') return false;
  if (task.snoozed_until && task.snoozed_until > nowIso) return false;
  return true;
}

function moduleCoveredByDerivedTask(
  suggestion: AiSuggestionRawItem,
  task: SecretaryTask,
): boolean {
  if (task.source_kind !== 'derived') return false;

  const coveredTypes = MODULE_DERIVED_TASK_TYPES[suggestion.module];
  if (!coveredTypes) return false;

  return coveredTypes.includes(task.task_type);
}

export function isDuplicateSuggestion(
  suggestion: AiSuggestionRawItem,
  existingTasks: SecretaryTask[],
  nowIso = new Date().toISOString(),
): boolean {
  const normalizedTitle = normalizeSuggestionTitle(suggestion.title);

  for (const task of existingTasks) {
    if (!isActionableExistingTask(task, nowIso)) continue;

    if (normalizeSuggestionTitle(task.title) === normalizedTitle) {
      return true;
    }

    if (moduleCoveredByDerivedTask(suggestion, task)) {
      return true;
    }

    if (
      task.source_kind === 'ai_suggested' &&
      task.source_ref &&
      typeof task.source_ref.suggestionKey === 'string' &&
      task.source_ref.suggestionKey === suggestion.suggestionKey
    ) {
      return true;
    }
  }

  return false;
}

export function filterNonDuplicateSuggestions(
  suggestions: AiSuggestionRawItem[],
  existingTasks: SecretaryTask[],
  nowIso = new Date().toISOString(),
): AiSuggestionRawItem[] {
  const accepted: AiSuggestionRawItem[] = [];
  const seenKeys = new Set<string>();
  const seenTitles = new Set<string>();

  for (const suggestion of suggestions) {
    if (seenKeys.has(suggestion.suggestionKey)) continue;
    if (seenTitles.has(normalizeSuggestionTitle(suggestion.title))) continue;
    if (isDuplicateSuggestion(suggestion, [...existingTasks, ...accepted.map(toPseudoTask)], nowIso)) {
      continue;
    }

    seenKeys.add(suggestion.suggestionKey);
    seenTitles.add(normalizeSuggestionTitle(suggestion.title));
    accepted.push(suggestion);
  }

  return accepted;
}

function toPseudoTask(suggestion: AiSuggestionRawItem): SecretaryTask {
  return {
    id: suggestion.suggestionKey,
    task_type: 'custom',
    title: suggestion.title,
    description: null,
    priority: suggestion.priority,
    status: 'pending',
    module: suggestion.module,
    due_at: null,
    scheduled_date: '1970-01-01',
    assignee_profile_id: null,
    source_kind: 'ai_suggested',
    source_ref: { suggestionKey: suggestion.suggestionKey, rationale: suggestion.rationale },
    source_ref_hash: null,
    action_href: null,
    metadata: { aiSuggested: true, rationale: suggestion.rationale },
    completed_at: null,
    completed_by: null,
    snoozed_until: null,
    active_session_started_at: null,
    created_at: '1970-01-01T00:00:00.000Z',
    updated_at: '1970-01-01T00:00:00.000Z',
  };
}

export function hasMarkdownInSuggestionText(text: string): boolean {
  return MARKDOWN_PATTERN.test(text);
}
