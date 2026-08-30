import { finalizeSecretaryGuidanceText } from '@/lib/secretary/guidance-voice';
import { buildFallbackTaskOrder } from '@/lib/secretary/task-order-fallback';
import {
  formatGuidanceStepsSequence,
  groupTasksIntoGuidanceSteps,
} from '@/lib/secretary/task-work-sessions';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

export function formatGuidanceTaskSequence(tasks: SecretaryTask[]): string {
  return formatGuidanceStepsSequence(groupTasksIntoGuidanceSteps(tasks));
}

export function buildFallbackSecretaryGuidance(
  tasks: SecretaryTask[],
  snapshot: SecretarySnapshot,
  nowIso = new Date().toISOString(),
): string {
  const ordered = buildFallbackTaskOrder(tasks, nowIso, {
    isBranch2Day: snapshot.isBranch2Day,
  });
  return buildSecretaryGuidanceFromOrderedTasks(ordered, snapshot);
}

export function buildSecretaryGuidanceFromOrderedTasks(
  orderedActionable: SecretaryTask[],
  snapshot: SecretarySnapshot,
): string {
  if (orderedActionable.length === 0) {
    return finalizeSecretaryGuidanceText('วันนี้ไม่มีงานค้าง — พร้อมรับงานใหม่เมื่อมีนะคะ');
  }

  const sequence = formatGuidanceTaskSequence(orderedActionable);
  if (snapshot.isBranch2Day) {
    return finalizeSecretaryGuidanceText(`วันไปสาขา 2 — แนะนำทำตามลำดับนี้นะคะ: ${sequence}`);
  }
  return finalizeSecretaryGuidanceText(`แนะนำทำตามลำดับนี้นะคะ: ${sequence}`);
}
