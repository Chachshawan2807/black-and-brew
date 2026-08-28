import { collectGuidanceTasks } from '@/lib/secretary/guidance-fingerprint';
import { compareSecretaryBoardTasks } from '@/lib/secretary/visible-board-tasks';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

export function buildFallbackSecretaryGuidance(
  tasks: SecretaryTask[],
  snapshot: SecretarySnapshot,
  nowIso = new Date().toISOString(),
): string {
  const actionable = collectGuidanceTasks(tasks, nowIso).toSorted(compareSecretaryBoardTasks);

  if (actionable.length === 0) {
    return 'วันนี้ไม่มีงานค้าง — พร้อมรับงานใหม่เมื่อมี';
  }

  const inProgress = actionable.find((task) => task.status === 'in_progress');
  if (inProgress) {
    const nextPending = actionable.find((task) => task.status === 'pending' && task.id !== inProgress.id);
    if (nextPending) {
      return `ขณะนี้กำลังทำ "${inProgress.title}" — เสร็จแล้วแนะนำต่อด้วย "${nextPending.title}"`;
    }
    return `ขณะนี้กำลังทำ "${inProgress.title}" — ทำให้เสร็จก่อนเริ่มงานอื่น`;
  }

  const [first, second] = actionable;
  if (snapshot.isBranch2Day && second) {
    return `วันไปสาขา 2 — แนะนำเริ่มจาก "${first.title}" แล้วต่อด้วย "${second.title}"`;
  }
  if (second) {
    return `แนะนำเริ่มจาก "${first.title}" ก่อน แล้วต่อด้วย "${second.title}"`;
  }
  return `แนะนำเริ่มจาก "${first.title}"`;
}
