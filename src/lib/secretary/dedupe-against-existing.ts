import { MODULE_DERIVED_TASK_TYPES } from '@/lib/secretary/ai-suggestion-types';
import type { AiSuggestionRawItem } from '@/lib/secretary/ai-suggestion-types';
import { resolveWorkSession } from '@/lib/secretary/task-work-sessions';
import type { SecretaryModule, SecretaryTask } from '@/lib/secretary/types';

const MARKDOWN_PATTERN = /```|#{1,6}\s|(^|\n)\s*[-*•]\s/;

const SCHEDULE_REVIEW_TASK_TYPES = new Set([
  'schedule_understaffed',
  'schedule_leave_risk',
  'schedule_mgmt_review',
]);

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
  suggestion: Pick<AiSuggestionRawItem, 'module'>,
  task: SecretaryTask,
): boolean {
  if (task.source_kind !== 'derived') return false;

  const coveredTypes = MODULE_DERIVED_TASK_TYPES[suggestion.module];
  if (!coveredTypes) return false;

  return coveredTypes.includes(task.task_type);
}

function isScheduleDomainSuggestion(suggestion: Pick<AiSuggestionRawItem, 'module'>): boolean {
  return suggestion.module === 'schedule' || suggestion.module === 'dashboard';
}

function isScheduleDomainTask(task: SecretaryTask): boolean {
  if (resolveWorkSession(task)) return true;
  if (task.module === 'schedule') return true;
  if (task.module === 'dashboard' && SCHEDULE_REVIEW_TASK_TYPES.has(task.task_type)) {
    return true;
  }
  return false;
}

function isSameDomainDerivedTask(
  suggestion: Pick<AiSuggestionRawItem, 'module'>,
  task: SecretaryTask,
): boolean {
  return task.source_kind === 'derived' && task.module === suggestion.module;
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

    if (isSameDomainDerivedTask(suggestion, task)) {
      return true;
    }

    if (moduleCoveredByDerivedTask(suggestion, task)) {
      return true;
    }

    if (isScheduleDomainSuggestion(suggestion) && isScheduleDomainTask(task)) {
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

function aiTaskToSuggestion(task: SecretaryTask): AiSuggestionRawItem | null {
  if (task.source_kind !== 'ai_suggested') return null;

  const suggestionKey =
    task.source_ref && typeof task.source_ref.suggestionKey === 'string'
      ? task.source_ref.suggestionKey
      : task.id;

  const rationale =
    task.metadata && typeof task.metadata.rationale === 'string' ? task.metadata.rationale : '';

  return {
    suggestionKey,
    title: task.title,
    description: task.description ?? undefined,
    module: task.module,
    priority: task.priority,
    rationale,
  };
}

/** Pending AI rows that repeat an existing derived/manual card should be retired. */
export function findRedundantAiSuggestedTaskIds(
  tasks: SecretaryTask[],
  nowIso = new Date().toISOString(),
): string[] {
  const actionable = tasks.filter((task) => isActionableExistingTask(task, nowIso));
  const nonAi = actionable.filter((task) => task.source_kind !== 'ai_suggested');

  return actionable
    .filter((task) => task.source_kind === 'ai_suggested')
    .filter((task) => {
      const suggestion = aiTaskToSuggestion(task);
      if (!suggestion) return false;
      return isDuplicateSuggestion(suggestion, nonAi, nowIso);
    })
    .map((task) => task.id);
}

function toPseudoTask(suggestion: AiSuggestionRawItem): SecretaryTask {
  return {
    id: suggestion.suggestionKey,
    task_type: 'custom',
    title: suggestion.title,
    description: null,
    priority: suggestion.priority,
    status: 'pending',
    module: suggestion.module as SecretaryModule,
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
