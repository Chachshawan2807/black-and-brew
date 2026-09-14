import { buildSourceRefHash } from '@/lib/secretary/source-ref-hash';
import type { DerivedTaskDraft, SecretarySnapshot } from '@/lib/secretary/types';

export function deriveMaintenanceTasks(snapshot: SecretarySnapshot): DerivedTaskDraft[] {
  const tasks: DerivedTaskDraft[] = [];
  const localePrefix = `/${snapshot.locale}`;

  const overdue = snapshot.maintenanceTasks.filter((task) => task.urgency === 'overdue');
  if (overdue.length > 0) {
    const sourceRef = {
      rule: 'maintenance_overdue',
      ids: overdue.map((task) => task.id),
    };
    tasks.push({
      taskType: 'maintenance_overdue',
      title: `ซ่อมบำรุงเลยกำหนด (${overdue.length})`,
      description: overdue.map((task) => task.equipment).slice(0, 5).join(', '),
      priority: 'urgent',
      module: 'maintenance',
      sourceRef,
      sourceRefHash: buildSourceRefHash('maintenance_overdue', sourceRef),
      actionHref: `${localePrefix}/maintenance`,
      estimatedMinutes: 45,
    });
  }

  const dueSoon = snapshot.maintenanceTasks.filter(
    (task) => task.urgency === 'within_7_days' || task.urgency === 'within_30_days',
  );
  if (dueSoon.length > 0 && overdue.length === 0) {
    const sourceRef = { rule: 'maintenance_due', ids: dueSoon.map((task) => task.id) };
    tasks.push({
      taskType: 'maintenance_due',
      title: `ซ่อมบำรุงใกล้ครบกำหนด (${dueSoon.length})`,
      description: dueSoon.map((task) => task.equipment).slice(0, 5).join(', '),
      priority: 'normal',
      module: 'maintenance',
      sourceRef,
      sourceRefHash: buildSourceRefHash('maintenance_due', sourceRef),
      actionHref: `${localePrefix}/maintenance`,
      estimatedMinutes: 30,
    });
  }

  return tasks;
}
