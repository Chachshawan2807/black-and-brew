import {
  extractScheduleShiftEmployeeId,
  type ScheduleEditHistoryRow,
} from '@/lib/schedule/edit-history-display';

type ProfileNameRow = { id: string; full_name: string | null };

/** Backfill staff names on legacy schedule shift logs for settings history. */
export async function enrichScheduleEditHistoryRows<T extends ScheduleEditHistoryRow>(
  rows: T[],
  fetchProfiles: (ids: string[]) => Promise<ProfileNameRow[]>,
): Promise<T[]> {
  const employeeIds = new Set<string>();

  for (const row of rows) {
    if (row.module !== 'schedule' || row.entity_type !== 'shift') continue;
    if (typeof row.metadata?.staffName === 'string' && row.metadata.staffName.trim()) continue;
    const employeeId = extractScheduleShiftEmployeeId(row);
    if (employeeId) employeeIds.add(employeeId);
  }

  if (employeeIds.size === 0) return rows as T[];

  const profiles = await fetchProfiles([...employeeIds]);
  const nameById = new Map(
    profiles.map((profile) => [profile.id, profile.full_name?.trim() || '']),
  );

  return rows.map((row) => {
    if (row.module !== 'schedule' || row.entity_type !== 'shift') return row;
    if (typeof row.metadata?.staffName === 'string' && row.metadata.staffName.trim()) {
      return row;
    }

    const employeeId = extractScheduleShiftEmployeeId(row);
    if (!employeeId) return row;

    const staffName = nameById.get(employeeId);
    if (!staffName) return row;

    return {
      ...row,
      entity_label: row.entity_label?.trim() ? row.entity_label : staffName,
      metadata: {
        ...row.metadata,
        staffName,
        employeeId,
      },
    };
  });
}
