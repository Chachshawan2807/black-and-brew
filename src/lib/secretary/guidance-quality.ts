import { collectGuidanceTasks } from '@/lib/secretary/guidance-fingerprint';
import { buildFallbackSecretaryGuidance } from '@/lib/secretary/guidance-fallback';
import { finalizeSecretaryGuidanceText } from '@/lib/secretary/guidance-voice';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

const DEFAULT_MAX_LENGTH = 1200;

export function normalizeGuidanceText(text: string, maxLength = DEFAULT_MAX_LENGTH): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function guidanceCoversAllTasks(text: string, tasks: SecretaryTask[]): boolean {
  if (tasks.length === 0) return true;
  return tasks.every((task) => text.includes(task.title));
}

export function isUsableGuidanceText(
  text: string,
  actionableTaskCount: number,
  actionableTasks: SecretaryTask[] = [],
): boolean {
  const normalized = normalizeGuidanceText(text);
  if (!normalized) return false;
  if (actionableTaskCount === 0) return true;
  if (normalized.length < 20) return false;
  if (actionableTasks.length > 0 && !guidanceCoversAllTasks(normalized, actionableTasks)) {
    return false;
  }
  return true;
}

export function resolveGuidanceText(
  candidate: string,
  fallback: string,
  actionableTaskCount: number,
  actionableTasks: SecretaryTask[] = [],
): string {
  const normalized = normalizeGuidanceText(candidate);
  if (isUsableGuidanceText(normalized, actionableTaskCount, actionableTasks)) {
    return finalizeSecretaryGuidanceText(normalized);
  }
  return fallback;
}

export function buildCanonicalSecretaryGuidance(
  tasks: SecretaryTask[],
  snapshot: SecretarySnapshot,
  nowIso = new Date().toISOString(),
): string {
  return buildFallbackSecretaryGuidance(tasks, snapshot, nowIso);
}

export function resolveSecretaryGuidanceFromAi(
  candidate: string,
  tasks: SecretaryTask[],
  snapshot: SecretarySnapshot,
  nowIso = new Date().toISOString(),
): string {
  const actionable = collectGuidanceTasks(tasks, nowIso);
  const fallback = buildFallbackSecretaryGuidance(tasks, snapshot, nowIso);
  return resolveGuidanceText(candidate, fallback, actionable.length, actionable);
}
