import { collectGuidanceTasks } from '@/lib/secretary/guidance-fingerprint';
import type { SecretaryTask } from '@/lib/secretary/types';

export function buildFallbackTaskOrder(
  tasks: SecretaryTask[],
  nowIso = new Date().toISOString(),
): SecretaryTask[] {
  return collectGuidanceTasks(tasks, nowIso);
}
