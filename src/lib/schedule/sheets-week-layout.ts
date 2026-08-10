import { DEFAULT_SHIFT_TYPES, type ShiftTypeEntry } from '@/lib/shift-type-config';
import { normalizeShiftLocation } from '@/lib/schedule/format-daily-shifts';
import {
  SHEETS_BRANCH1_LABEL_COLUMN,
  SHEETS_DAY_COLUMNS,
  SHEETS_DAY_LABELS,
  SHEETS_FRONT_STORE_SHIFT_KEYS,
  SHEETS_ROW_LABELS,
  SHEETS_SHIFT_TIME_LABELS,
  type SheetsFrontStoreShiftKey,
} from '@/lib/schedule/sheets-layout-config';
import type { SheetsWeekBlockLayout } from '@/lib/schedule/sheets-week-block';
import { buildWeekDayIsoStrings } from '@/lib/schedule/sheets-week-block';
import { quoteSheetRange } from '@/lib/google/sheets-api';
import type { SheetsValueUpdate } from '@/lib/google/sheets-api';

export interface SheetsWeekProfile {
  id: string;
  full_name: string;
  schedule_order: number | null;
}

export interface SheetsWeekShift {
  employee_id: string | null;
  start_time: string;
  status: string | null;
  metadata?: {
    location?: string | null;
    remark?: string | null;
    is_management?: boolean;
  } | null;
}

interface DayAssignment {
  profileId: string;
  name: string;
  scheduleOrder: number;
  location: string;
  remark?: string;
  isManagement?: boolean;
}

function isSameCalendarDay(shiftStartTime: string, isoDate: string): boolean {
  return shiftStartTime.startsWith(isoDate);
}

function formatEmployeeSheetName(
  name: string,
  location: string,
  remark?: string,
  isManagement?: boolean,
): string {
  const trimmedRemark = remark?.trim();
  if (location === 'ไปสาขา 2' && trimmedRemark) {
    return `${name} (${trimmedRemark})`;
  }
  if (trimmedRemark && isManagement) {
    return `${name} (${trimmedRemark})`;
  }
  return name;
}

function compareByScheduleOrderThenName(a: DayAssignment, b: DayAssignment): number {
  if (a.scheduleOrder !== b.scheduleOrder) return a.scheduleOrder - b.scheduleOrder;
  return a.name.localeCompare(b.name, 'th');
}

function resolveFrontStoreBucket(location: string): SheetsFrontStoreShiftKey | null {
  if (location === '6:30' || location === '7:00' || location === '8:00') {
    return location;
  }
  return null;
}

function getFohCountValues(types: ShiftTypeEntry[]): Set<string> {
  return new Set(types.filter((type) => type.fohCount).map((type) => type.value));
}

function collectAssignmentsForDay(
  profiles: SheetsWeekProfile[],
  shifts: SheetsWeekShift[],
  isoDate: string,
): DayAssignment[] {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  return shifts
    .filter((shift) => shift.employee_id && isSameCalendarDay(shift.start_time, isoDate))
    .map((shift) => {
      const profile = profileById.get(shift.employee_id!);
      if (!profile) return null;

      const location = normalizeShiftLocation(
        shift.metadata?.location ?? undefined,
        shift.status ?? undefined,
      );

      return {
        profileId: profile.id,
        name: profile.full_name,
        scheduleOrder: profile.schedule_order ?? 0,
        location,
        remark: shift.metadata?.remark ?? undefined,
        isManagement: shift.metadata?.is_management ?? false,
      } satisfies DayAssignment;
    })
    .filter((entry): entry is DayAssignment => entry !== null);
}

function joinNames(assignments: DayAssignment[]): string {
  return assignments
    .sort(compareByScheduleOrderThenName)
    .map((entry) =>
      formatEmployeeSheetName(entry.name, entry.location, entry.remark, entry.isManagement),
    )
    .join('\n');
}

function countFohStaff(
  assignments: DayAssignment[],
  fohLocations: Set<string>,
): number {
  const ids = new Set<string>();
  for (const entry of assignments) {
    if (fohLocations.has(entry.location)) {
      ids.add(entry.profileId);
    }
  }
  return ids.size;
}

function buildRowValues(
  weekDays: string[],
  profiles: SheetsWeekProfile[],
  shifts: SheetsWeekShift[],
  picker: (assignments: DayAssignment[]) => string,
): string[] {
  return weekDays.map((date) => {
    const assignments = collectAssignmentsForDay(profiles, shifts, date);
    return picker(assignments);
  });
}

function branch1DayColumnRange(tabName: string, row: number): string {
  const start = `${SHEETS_DAY_COLUMNS[0]}${row}`;
  const end = `${SHEETS_DAY_COLUMNS[6]}${row}`;
  return quoteSheetRange(tabName, `${start}:${end}`);
}

function branch1LabelCell(tabName: string, row: number): string {
  return quoteSheetRange(tabName, `${SHEETS_BRANCH1_LABEL_COLUMN}${row}`);
}

export function buildScheduleSheetsUpdates(
  weekStartMonday: string,
  profiles: SheetsWeekProfile[],
  shifts: SheetsWeekShift[],
  tabName: string,
  blockLayout: SheetsWeekBlockLayout,
  shiftTypes: ShiftTypeEntry[] = DEFAULT_SHIFT_TYPES,
): SheetsValueUpdate[] {
  const weekDays = buildWeekDayIsoStrings(weekStartMonday);
  const fohLocations = getFohCountValues(shiftTypes);
  const updates: SheetsValueUpdate[] = [];

  updates.push({
    range: branch1DayColumnRange(tabName, blockLayout.dateRow),
    values: [
      weekDays.map((date) => String(new Date(date).getDate())),
    ],
  });

  updates.push({
    range: branch1DayColumnRange(tabName, blockLayout.dayLabelRow),
    values: [[...SHEETS_DAY_LABELS]],
  });

  for (const shiftKey of SHEETS_FRONT_STORE_SHIFT_KEYS) {
    const row = blockLayout.frontStoreShiftRows[shiftKey];
    updates.push({
      range: branch1LabelCell(tabName, row),
      values: [[SHEETS_SHIFT_TIME_LABELS[shiftKey]]],
    });
    updates.push({
      range: branch1DayColumnRange(tabName, row),
      values: [
        buildRowValues(weekDays, profiles, shifts, (assignments) => {
          const bucket = assignments.filter(
            (entry) => resolveFrontStoreBucket(entry.location) === shiftKey,
          );
          return joinNames(bucket);
        }),
      ],
    });
  }

  updates.push({
    range: branch1DayColumnRange(tabName, blockLayout.fohCountRow),
    values: [
      weekDays.map((date) => {
        const assignments = collectAssignmentsForDay(profiles, shifts, date);
        return String(countFohStaff(assignments, fohLocations));
      }),
    ],
  });

  updates.push({
    range: branch1LabelCell(tabName, blockLayout.laundryLabelRow),
    values: [[SHEETS_ROW_LABELS.laundry]],
  });
  updates.push({
    range: branch1DayColumnRange(tabName, blockLayout.laundryRow),
    values: [
      buildRowValues(weekDays, profiles, shifts, (assignments) => {
        const bucket = assignments.filter((entry) => entry.location === 'ร้านซักผ้า');
        return joinNames(bucket);
      }),
    ],
  });

  updates.push({
    range: branch1LabelCell(tabName, blockLayout.branch2Row),
    values: [[SHEETS_ROW_LABELS.branch2]],
  });
  updates.push({
    range: branch1DayColumnRange(tabName, blockLayout.branch2Row),
    values: [
      buildRowValues(weekDays, profiles, shifts, (assignments) => {
        const bucket = assignments.filter((entry) => entry.location === 'ไปสาขา 2');
        return joinNames(bucket);
      }),
    ],
  });

  return updates;
}
