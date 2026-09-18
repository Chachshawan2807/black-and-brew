import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';
import { filterScheduleTaskDescription } from '@/lib/proactive-insights/filter-schedule-alert-display';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';

/** Detail body for secretary task overlays. Snapshot is accepted for call-site compatibility. */
export function resolveSecretaryTaskDetailText(
  task: Pick<SecretaryTask, 'task_type' | 'description' | 'source_ref'>,
  _snapshot?: Pick<SecretarySnapshot, 'operational' | 'itemsToOrder'>,
): string | null {
  const filtered = filterScheduleTaskDescription(
    task.task_type,
    task.description,
    task.source_ref,
    todayIsoBkk(),
  );
  return filtered?.trim() ? filtered : null;
}
