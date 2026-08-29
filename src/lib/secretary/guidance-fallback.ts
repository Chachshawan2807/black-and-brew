import { collectGuidanceTasks } from '@/lib/secretary/guidance-fingerprint';
import { finalizeSecretaryGuidanceText } from '@/lib/secretary/guidance-voice';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

export function formatGuidanceTaskSequence(tasks: SecretaryTask[]): string {
  if (tasks.length === 0) return '';
  if (tasks.length === 1) return `"${tasks[0].title}"`;

  const quoted = tasks.map((task) => `"${task.title}"`);
  const last = quoted.pop()!;
  return `${quoted.join(' แล้วต่อด้วย ')} แล้วต่อด้วย ${last}`;
}

export function buildFallbackSecretaryGuidance(
  tasks: SecretaryTask[],
  snapshot: SecretarySnapshot,
  nowIso = new Date().toISOString(),
): string {
  const actionable = collectGuidanceTasks(tasks, nowIso);
  return buildSecretaryGuidanceFromOrderedTasks(actionable, snapshot);
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
