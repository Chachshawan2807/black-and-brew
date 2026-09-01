import { buildSummaryGuidance } from '@/lib/secretary/guidance-fallback';
import { finalizeSecretaryGuidanceText } from '@/lib/secretary/guidance-voice';
import { buildFallbackTaskOrder } from '@/lib/secretary/task-order-fallback';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

export const DEFAULT_MAX_LENGTH = 280;
const MIN_LENGTH = 20;

const MARKDOWN_LIST_PATTERN = /(^|\n)\s*[-*•]\s|```|#{1,6}\s/;

function titleKeyword(title: string): string {
  const stripped = title.replace(/^["']|["']$/g, '').trim();
  if (stripped.length <= 12) return stripped;
  const words = stripped.split(/\s+/).filter(Boolean);
  return words[0] ?? stripped.slice(0, 8);
}

function mentionsTaskHint(text: string, task: SecretaryTask): boolean {
  const keyword = titleKeyword(task.title);
  if (keyword.length >= 2 && text.includes(keyword)) return true;
  return text.includes(task.title);
}

export function normalizeGuidanceText(text: string, maxLength = DEFAULT_MAX_LENGTH): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function isUsableSummaryGuidance(
  text: string,
  actionableTasks: SecretaryTask[],
): boolean {
  const normalized = normalizeGuidanceText(text);
  if (!normalized) return false;
  if (actionableTasks.length === 0) return true;
  if (normalized.length < MIN_LENGTH || normalized.length > DEFAULT_MAX_LENGTH) return false;
  if (MARKDOWN_LIST_PATTERN.test(normalized)) return false;
  if (actionableTasks.length > 1 && /แล้วต่อด้วย/.test(normalized)) return false;

  const inProgress = actionableTasks.find((t) => t.status === 'in_progress');
  if (inProgress && !mentionsTaskHint(normalized, inProgress)) {
    return false;
  }

  const urgentTasks = actionableTasks.filter((t) => t.priority === 'urgent');
  if (!inProgress && urgentTasks.length > 0) {
    const reflectsUrgency =
      /เร่ง|ด่วน|สำคัญ/.test(normalized) ||
      urgentTasks.some((t) => mentionsTaskHint(normalized, t));
    if (!reflectsUrgency) return false;
  }

  if (!inProgress && urgentTasks.length === 0 && actionableTasks.length > 0) {
    const top = actionableTasks[0]!;
    if (!mentionsTaskHint(normalized, top)) return false;
  }

  return true;
}

/** @deprecated Use isUsableSummaryGuidance for new summary-style guidance */
export function isUsableGuidanceText(
  text: string,
  actionableTaskCount: number,
  actionableTasks: SecretaryTask[] = [],
): boolean {
  return isUsableSummaryGuidance(text, actionableTasks.slice(0, actionableTaskCount));
}

export function resolveGuidanceText(
  candidate: string,
  fallback: string,
  actionableTasks: SecretaryTask[],
): string {
  const normalized = normalizeGuidanceText(candidate);
  if (isUsableSummaryGuidance(normalized, actionableTasks)) {
    return finalizeSecretaryGuidanceText(normalized);
  }
  return fallback;
}

export function resolveSecretaryGuidanceFromAi(
  candidate: string,
  orderedTasks: SecretaryTask[],
  snapshot: SecretarySnapshot,
): string {
  const fallback = buildSummaryGuidance(orderedTasks, snapshot);
  return resolveGuidanceText(candidate, fallback, orderedTasks);
}

export function resolveSecretaryGuidanceFromTasks(
  candidate: string,
  tasks: SecretaryTask[],
  snapshot: SecretarySnapshot,
  nowIso = new Date().toISOString(),
): string {
  const ordered = buildFallbackTaskOrder(tasks, nowIso, {
    isBranch2Day: snapshot.isBranch2Day,
  });
  return resolveSecretaryGuidanceFromAi(candidate, ordered, snapshot);
}
