import { computeUpcomingMaintenanceTasks } from '@/lib/maintenance/compute-upcoming-maintenance';
import type {
  MaintenanceServiceRecord,
  MaintenanceUrgencyGroup,
  UpcomingMaintenanceTask,
} from '@/lib/maintenance/types';

export const MAINTENANCE_DUE_WITHIN_WEEK_GROUPS: MaintenanceUrgencyGroup[] = [
  'overdue',
  'within_7_days',
];

export function filterMaintenanceDueWithinWeek(
  tasks: UpcomingMaintenanceTask[],
): UpcomingMaintenanceTask[] {
  return tasks.filter((task) => MAINTENANCE_DUE_WITHIN_WEEK_GROUPS.includes(task.urgency));
}

export function computeMaintenanceDueWithinWeek(
  records: MaintenanceServiceRecord[],
  currentIsoDate: string,
): UpcomingMaintenanceTask[] {
  return filterMaintenanceDueWithinWeek(
    computeUpcomingMaintenanceTasks(records, currentIsoDate),
  );
}
