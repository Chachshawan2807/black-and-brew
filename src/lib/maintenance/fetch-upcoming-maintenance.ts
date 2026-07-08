import { fetchTablePreset } from '@/lib/ai-data-gateway';
import { computeUpcomingMaintenanceTasks } from '@/lib/maintenance/compute-upcoming-maintenance';
import type { MaintenanceServiceRecord } from '@/lib/maintenance/types';

export async function fetchUpcomingMaintenanceTasks(currentIsoDate: string) {
  const result = await fetchTablePreset('service_records');

  if (!result.ok) {
    throw new Error(result.error?.message ?? 'Failed to fetch service_records');
  }

  const records = result.rows as unknown as MaintenanceServiceRecord[];
  return computeUpcomingMaintenanceTasks(records, currentIsoDate);
}
