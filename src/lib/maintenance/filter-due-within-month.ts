import { computeUpcomingMaintenanceTasks } from '@/lib/maintenance/compute-upcoming-maintenance';
import type {
  MaintenanceServiceRecord,
  MaintenanceUrgencyGroup,
  UpcomingMaintenanceTask,
} from '@/lib/maintenance/types';

export const MAINTENANCE_DUE_WITHIN_MONTH_GROUPS: MaintenanceUrgencyGroup[] = [
  'overdue',
  'within_7_days',
  'within_30_days',
];

export function filterMaintenanceDueWithinMonth(
  tasks: UpcomingMaintenanceTask[],
): UpcomingMaintenanceTask[] {
  return tasks.filter((task) => MAINTENANCE_DUE_WITHIN_MONTH_GROUPS.includes(task.urgency));
}

export function computeMaintenanceDueWithinMonth(
  records: MaintenanceServiceRecord[],
  currentIsoDate: string,
): UpcomingMaintenanceTask[] {
  return filterMaintenanceDueWithinMonth(
    computeUpcomingMaintenanceTasks(records, currentIsoDate),
  );
}
