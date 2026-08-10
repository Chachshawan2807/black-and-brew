import { normalizeShiftLocation } from '@/lib/schedule/format-daily-shifts';
import {
  SHEETS_DAY_COLUMNS,
  SHEETS_FRONT_STORE_SHIFT_KEYS,
  type SheetsFrontStoreShiftKey,
} from '@/lib/schedule/sheets-layout-config';
import type { SheetsWeekBlockLayout } from '@/lib/schedule/sheets-week-block';
import {
  buildWeekDayIsoStrings,
  mapWeekValuesToSheetColumns,
} from '@/lib/schedule/sheets-week-block';
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
}

function isSameCalendarDay(shiftStartTime: string, isoDate: string): boolean {
  return shiftStartTime.startsWith(isoDate);
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

function collectAssignmentsForDay(
  profiles: SheetsWeekProfile[],
  shifts: SheetsWeekShift[],
  isoDate: string,
): DayAssignment[] {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  const assignments: DayAssignment[] = [];

  for (const shift of shifts) {
    if (!shift.employee_id || !isSameCalendarDay(shift.start_time, isoDate)) continue;

    const profile = profileById.get(shift.employee_id);
    if (!profile) continue;

    const location = normalizeShiftLocation(
      shift.metadata?.location ?? undefined,
      shift.status ?? undefined,
    );

    assignments.push({
      profileId: profile.id,
      name: profile.full_name,
      scheduleOrder: profile.schedule_order ?? 0,
      location,
    });
  }

  return assignments;
}

/** Replace slot contents top-down; leftover slots are cleared (never appended). */
export function mergeNamesIntoSlots(existingSlots: string[], newNames: string[]): string[] {
  return existingSlots.map((_, slotIdx) => newNames[slotIdx] ?? '');
}

/** One employee name per sub-row (Mon→Sun columns), replacing prior cell values. */
export function buildFrontStoreShiftSubRows(
  weekDays: string[],
  profiles: SheetsWeekProfile[],
  shifts: SheetsWeekShift[],
  shiftKey: SheetsFrontStoreShiftKey,
  subRowCount: number,
): string[][] {
  const rows: string[][] = Array.from({ length: subRowCount }, () =>
    weekDays.map(() => ''),
  );

  for (let dayIdx = 0; dayIdx < weekDays.length; dayIdx += 1) {
    const assignments = collectAssignmentsForDay(profiles, shifts, weekDays[dayIdx]);
    const newNames = assignments
      .filter((entry) => resolveFrontStoreBucket(entry.location) === shiftKey)
      .sort(compareByScheduleOrderThenName)
      .map((entry) => entry.name);

    const merged = mergeNamesIntoSlots(
      rows.map((row) => row[dayIdx]),
      newNames,
    );
    for (let slot = 0; slot < subRowCount; slot += 1) {
      rows[slot][dayIdx] = merged[slot];
    }
  }

  return rows;
}

function firstEmployeeName(assignments: DayAssignment[]): string {
  const sorted = [...assignments].sort(compareByScheduleOrderThenName);
  return sorted[0]?.name ?? '';
}

function buildSingleNameRowValues(
  weekDays: string[],
  profiles: SheetsWeekProfile[],
  shifts: SheetsWeekShift[],
  location: string,
): string[] {
  return weekDays.map((date) => {
    const assignments = collectAssignmentsForDay(profiles, shifts, date);
    const bucket = assignments.filter((entry) => entry.location === location);
    return firstEmployeeName(bucket);
  });
}

function branch1DayColumnRange(tabName: string, startRow: number, endRow: number = startRow): string {
  const start = `${SHEETS_DAY_COLUMNS[0]}${startRow}`;
  const end = `${SHEETS_DAY_COLUMNS[6]}${endRow}`;
  return quoteSheetRange(tabName, `${start}:${end}`);
}

export function buildScheduleSheetsUpdates(
  weekStartMonday: string,
  profiles: SheetsWeekProfile[],
  shifts: SheetsWeekShift[],
  tabName: string,
  blockLayout: SheetsWeekBlockLayout,
): SheetsValueUpdate[] {
  const weekDays = buildWeekDayIsoStrings(weekStartMonday);
  const columnMap = blockLayout.columnMap;
  const subRowCount = blockLayout.frontStoreShiftSubRows;

  const frontStoreStart = blockLayout.frontStoreShiftRows['6:30'];
  const frontStoreEnd =
    blockLayout.frontStoreShiftRows['8:00'] + subRowCount - 1;
  const frontStoreValues: string[][] = [];

  for (const shiftKey of SHEETS_FRONT_STORE_SHIFT_KEYS) {
    const subRows = buildFrontStoreShiftSubRows(
      weekDays,
      profiles,
      shifts,
      shiftKey,
      subRowCount,
    );
    frontStoreValues.push(
      ...subRows.map((row) => mapWeekValuesToSheetColumns(row, columnMap)),
    );
  }

  return [
    {
      range: branch1DayColumnRange(tabName, frontStoreStart, frontStoreEnd),
      values: frontStoreValues,
    },
    {
      range: branch1DayColumnRange(tabName, blockLayout.laundryRow),
      values: [
        mapWeekValuesToSheetColumns(
          buildSingleNameRowValues(weekDays, profiles, shifts, 'ร้านซักผ้า'),
          columnMap,
        ),
      ],
    },
    {
      range: branch1DayColumnRange(tabName, blockLayout.branch2Row),
      values: [
        mapWeekValuesToSheetColumns(
          buildSingleNameRowValues(weekDays, profiles, shifts, 'ไปสาขา 2'),
          columnMap,
        ),
      ],
    },
  ];
}
