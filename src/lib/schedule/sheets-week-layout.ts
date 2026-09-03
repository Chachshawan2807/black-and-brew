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

function frontStoreEndRow(blockLayout: SheetsWeekBlockLayout): number {
  return (
    blockLayout.frontStoreShiftRows['8:00'] +
    blockLayout.frontStoreShiftSlotRows['8:00'] -
    1
  );
}

/** COUNTA formulas for the grey staff-count row (one formula per day column). */
export function buildFohCountFormulaRow(blockLayout: SheetsWeekBlockLayout): string[] {
  const frontStoreStart = blockLayout.frontStoreShiftRows['6:30'];
  const frontStoreEnd = frontStoreEndRow(blockLayout);

  return SHEETS_DAY_COLUMNS.map(
    (column) => `=counta(${column}${frontStoreStart}:${column}${frontStoreEnd})`,
  );
}

/** Ranges cleared before sync so empty slots stay truly empty (COUNTA counts only names). */
export function buildScheduleSheetClearRanges(
  tabName: string,
  blockLayout: SheetsWeekBlockLayout,
): string[] {
  const frontStoreStart = blockLayout.frontStoreShiftRows['6:30'];
  return [
    branch1DayColumnRange(tabName, frontStoreStart, frontStoreEndRow(blockLayout)),
    branch1DayColumnRange(tabName, blockLayout.laundryRow),
    branch1DayColumnRange(tabName, blockLayout.branch2Row),
  ];
}

function pushSparseSheetRow(
  updates: SheetsValueUpdate[],
  tabName: string,
  sheetRow: number,
  valuesInSheetColumnOrder: string[],
): void {
  for (let colIdx = 0; colIdx < valuesInSheetColumnOrder.length; colIdx += 1) {
    const name = valuesInSheetColumnOrder[colIdx]?.trim();
    if (!name) continue;

    updates.push({
      range: quoteSheetRange(tabName, `${SHEETS_DAY_COLUMNS[colIdx]}${sheetRow}`),
      values: [[name]],
    });
  }
}

function pushSparseSheetRows(
  updates: SheetsValueUpdate[],
  tabName: string,
  startRow: number,
  rowsInSheetColumnOrder: string[][],
): void {
  for (let rowOffset = 0; rowOffset < rowsInSheetColumnOrder.length; rowOffset += 1) {
    pushSparseSheetRow(updates, tabName, startRow + rowOffset, rowsInSheetColumnOrder[rowOffset]);
  }
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
  const updates: SheetsValueUpdate[] = [];

  let frontStoreRow = blockLayout.frontStoreShiftRows['6:30'];
  for (const shiftKey of SHEETS_FRONT_STORE_SHIFT_KEYS) {
    const slotRows = blockLayout.frontStoreShiftSlotRows[shiftKey];
    const subRows = buildFrontStoreShiftSubRows(
      weekDays,
      profiles,
      shifts,
      shiftKey,
      slotRows,
    );
    pushSparseSheetRows(
      updates,
      tabName,
      frontStoreRow,
      subRows.map((row) => mapWeekValuesToSheetColumns(row, columnMap)),
    );
    frontStoreRow += slotRows;
  }

  pushSparseSheetRow(
    updates,
    tabName,
    blockLayout.laundryRow,
    mapWeekValuesToSheetColumns(
      buildSingleNameRowValues(weekDays, profiles, shifts, 'ร้านซักผ้า'),
      columnMap,
    ),
  );

  pushSparseSheetRow(
    updates,
    tabName,
    blockLayout.branch2Row,
    mapWeekValuesToSheetColumns(
      buildSingleNameRowValues(weekDays, profiles, shifts, 'ไปสาขา 2'),
      columnMap,
    ),
  );

  updates.push({
    range: branch1DayColumnRange(tabName, blockLayout.fohCountRow),
    values: [buildFohCountFormulaRow(blockLayout)],
    inputOption: 'USER_ENTERED',
  });

  return updates;
}

/**
 * Dense row writes for the full front-store / laundry / branch-2 bands.
 * Replaces clear + sparse cell updates: empty strings overwrite removed names.
 */
export function buildScheduleSheetsDenseUpdates(
  weekStartMonday: string,
  profiles: SheetsWeekProfile[],
  shifts: SheetsWeekShift[],
  tabName: string,
  blockLayout: SheetsWeekBlockLayout,
): SheetsValueUpdate[] {
  const weekDays = buildWeekDayIsoStrings(weekStartMonday);
  const columnMap = blockLayout.columnMap;
  const updates: SheetsValueUpdate[] = [];

  const frontStoreRows: string[][] = [];
  for (const shiftKey of SHEETS_FRONT_STORE_SHIFT_KEYS) {
    const slotRows = blockLayout.frontStoreShiftSlotRows[shiftKey];
    const subRows = buildFrontStoreShiftSubRows(
      weekDays,
      profiles,
      shifts,
      shiftKey,
      slotRows,
    );
    for (const row of subRows) {
      frontStoreRows.push(mapWeekValuesToSheetColumns(row, columnMap));
    }
  }

  updates.push({
    range: branch1DayColumnRange(
      tabName,
      blockLayout.frontStoreShiftRows['6:30'],
      frontStoreEndRow(blockLayout),
    ),
    values: frontStoreRows,
  });

  updates.push({
    range: branch1DayColumnRange(tabName, blockLayout.laundryRow),
    values: [
      mapWeekValuesToSheetColumns(
        buildSingleNameRowValues(weekDays, profiles, shifts, 'ร้านซักผ้า'),
        columnMap,
      ),
    ],
  });

  updates.push({
    range: branch1DayColumnRange(tabName, blockLayout.branch2Row),
    values: [
      mapWeekValuesToSheetColumns(
        buildSingleNameRowValues(weekDays, profiles, shifts, 'ไปสาขา 2'),
        columnMap,
      ),
    ],
  });

  updates.push({
    range: branch1DayColumnRange(tabName, blockLayout.fohCountRow),
    values: [buildFohCountFormulaRow(blockLayout)],
    inputOption: 'USER_ENTERED',
  });

  return updates;
}
