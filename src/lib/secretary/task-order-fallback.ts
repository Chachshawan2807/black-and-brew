import { collectGuidanceTasks } from '@/lib/secretary/guidance-fingerprint';
import { compareSecretaryTaskOrder } from '@/lib/secretary/task-order-compare';
import { resolveSecretaryWorkdayPhase } from '@/lib/secretary/task-order-time-context';
import type { SecretaryTask } from '@/lib/secretary/types';

export function buildFallbackTaskOrder(
  tasks: SecretaryTask[],
  nowIso = new Date().toISOString(),
  options?: { isBranch2Day?: boolean },
): SecretaryTask[] {
  const phase = resolveSecretaryWorkdayPhase(new Date(nowIso));
  const actionable = collectGuidanceTasks(tasks, nowIso, options);
  return [...actionable].toSorted((a, b) => compareSecretaryTaskOrder(a, b, phase));
}
