import { createHash } from 'node:crypto';
import { buildGuidanceSnapshotSlice } from '@/lib/secretary/generate-guidance';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

export function buildAiSuggestionFingerprint(
  snapshot: SecretarySnapshot,
  existingTasks: SecretaryTask[],
): string {
  const slice = buildGuidanceSnapshotSlice(snapshot);
  const existing = existingTasks
    .filter((task) => task.status === 'pending' || task.status === 'in_progress')
    .map((task) => ({
      id: task.id,
      source_kind: task.source_kind,
      module: task.module,
      task_type: task.task_type,
      title: task.title,
      priority: task.priority,
    }))
    .toSorted((a, b) => a.id.localeCompare(b.id));

  const payload = JSON.stringify({
    ...slice,
    maintenanceOverdue: slice.maintenanceTasks.filter((item) => item.urgency === 'overdue').length,
    existing,
  });

  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}
