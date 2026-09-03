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

function resolveTopTaskTitle(orderedActionable: SecretaryTask[]): string {
  const inProgress = orderedActionable.find((t) => t.status === 'in_progress');
  if (inProgress) return inProgress.title;

  const urgent = orderedActionable.find((t) => t.priority === 'urgent');
  if (urgent) return urgent.title;

  return orderedActionable[0]!.title;
}

export function buildSummaryGuidance(
  orderedActionable: SecretaryTask[],
  snapshot: SecretarySnapshot,
): string {
  if (orderedActionable.length === 0) {
    return finalizeSecretaryGuidanceText('วันนี้ไม่มีงานค้าง พร้อมรับงานใหม่เมื่อมีนะคะ');
  }

  const topTitle = resolveTopTaskTitle(orderedActionable);
  const branchPrefix = snapshot.isBranch2Day ? 'วันไปสาขา 2 ' : '';

  if (orderedActionable.length === 1) {
    return finalizeSecretaryGuidanceText(`${branchPrefix}เริ่มจาก "${topTitle}" ก่อนนะคะ`);
  }

  const urgentCount = orderedActionable.filter((t) => t.priority === 'urgent').length;
  const urgentHint = urgentCount > 0 ? ` มีเร่งด่วน ${urgentCount} รายการ` : '';

  return finalizeSecretaryGuidanceText(
    `${branchPrefix}วันนี้มี ${orderedActionable.length} งานค้าง เริ่มจาก "${topTitle}" ก่อน${urgentHint} ดูลำดับเต็มได้ที่การ์ดด้านล่างนะคะ`,
  );
}

export function buildFallbackSecretaryGuidance(
  tasks: SecretaryTask[],
  snapshot: SecretarySnapshot,
  nowIso = new Date().toISOString(),
): string {
  const ordered = buildFallbackTaskOrder(tasks, nowIso);
  return buildSecretaryGuidanceFromOrderedTasks(ordered, snapshot);
}

export function buildSecretaryGuidanceFromOrderedTasks(
  orderedActionable: SecretaryTask[],
  snapshot: SecretarySnapshot,
): string {
  return buildSummaryGuidance(orderedActionable, snapshot);
}
