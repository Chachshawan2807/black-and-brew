import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import {
  SHEETS_DAY_COLUMNS,
  SHEETS_FRONT_STORE_SHIFT_KEYS,
  SHEETS_FRONT_STORE_SHIFT_SUBROWS,
  SHEETS_LAYOUT_ROW_OFFSETS,
  type SheetsFrontStoreShiftKey,
} from '@/lib/schedule/sheets-layout-config';
import { sheetDayLabelForWeekday, sheetDayLabelMatchesWeekday } from '@/lib/schedule/sheets-day-labels';

export const DEFAULT_WEEK_COLUMN_MAP = [0, 1, 2, 3, 4, 5, 6] as const;

export interface SheetsWeekBlockLayout {
  dateRow: number;
  dayLabelRow: number;
  /** Maps website week index (Mon=0 … Sun=6) to sheet column index (B=0 … H=6). */
  columnMap: number[];
  /** Day labels read from the sheet (B–H), when present. */
  sheetDayLabels?: string[];
  frontStoreShiftRows: Record<SheetsFrontStoreShiftKey, number>;
  frontStoreShiftSubRows: number;
  fohCountRow: number;
  laundryLabelRow: number;
  laundryRow: number;
  branch2Row: number;
}

export interface SheetsWeekBlockMatch {
  dateRow: number;
  columnMap: number[];
  sheetDayLabels?: string[];
}

export function buildWeekDayIsoStrings(weekStartMonday: string): string[] {
  const monday = startOfWeek(new Date(weekStartMonday), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) =>
    format(addDays(monday, index), 'yyyy-MM-dd'),
  );
}

export function weekDayNumbersFromIsoDates(weekDays: string[]): number[] {
  return weekDays.map((isoDate) => parseISO(isoDate).getDate());
}

function parseSheetDayNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function formatIsoDate(year: number, month: number, day: number): string {
  return format(new Date(year, month, day), 'yyyy-MM-dd');
}

/**
 * Resolve 7 consecutive day-of-month cells to ISO dates using the tab’s month as anchor.
 * Handles month rollover within the row (e.g. 27–31 then 1–2).
 */
export function resolveIsoDatesFromSheetDateRow(
  dayNumbers: number[],
  tabMonth: number,
  tabYear: number,
): string[] | null {
  if (dayNumbers.length !== SHEETS_DAY_COLUMNS.length) return null;

  const resolved: string[] = [];
  let month = tabMonth;
  let year = tabYear;

  for (let index = 0; index < dayNumbers.length; index += 1) {
    const day = dayNumbers[index];
    if (index > 0 && day < dayNumbers[index - 1]) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    resolved.push(formatIsoDate(year, month, day));
  }

  return resolved;
}

/** Map website week values (Mon→Sun) into B–H column order using columnMap. */
export function mapWeekValuesToSheetColumns(
  valuesByWeekIndex: string[],
  columnMap: number[],
): string[] {
  const row = Array.from({ length: SHEETS_DAY_COLUMNS.length }, () => '');
  for (let weekIdx = 0; weekIdx < valuesByWeekIndex.length; weekIdx += 1) {
    const column = columnMap[weekIdx];
    if (column >= 0 && column < row.length) {
      row[column] = valuesByWeekIndex[weekIdx];
    }
  }
  return row;
}

function buildDayLabelRowValues(
  weekDays: string[],
  columnMap: number[],
  sheetDayLabels?: string[],
): string[] {
  const valuesByWeekIndex = weekDays.map((isoDate, weekIdx) => {
    const weekday = parseISO(isoDate).getDay();
    const column = columnMap[weekIdx];
    const preferred = sheetDayLabels?.[column];
    return sheetDayLabelForWeekday(weekday, preferred);
  });

  return mapWeekValuesToSheetColumns(valuesByWeekIndex, columnMap);
}

/**
 * Locate the week block by matching full calendar dates and Thai day abbreviations.
 * Scans all rows (row 1 may be empty) within branch-1 day columns B–H.
 */
export function findWeekBlockInSheet(
  branchDayColumnRows: string[][],
  weekDays: string[],
  tabMonth: number,
  tabYear: number,
): SheetsWeekBlockMatch | null {
  if (weekDays.length !== SHEETS_DAY_COLUMNS.length) return null;

  for (let index = 0; index < branchDayColumnRows.length - 1; index += 1) {
    const dateCells = branchDayColumnRows[index];
    if (!dateCells || dateCells.length < SHEETS_DAY_COLUMNS.length) continue;

    const dayNumbers = dateCells
      .slice(0, SHEETS_DAY_COLUMNS.length)
      .map((cell) => parseSheetDayNumber(cell));

    if (dayNumbers.some((day) => day === null)) continue;

    const resolvedDates = resolveIsoDatesFromSheetDateRow(
      dayNumbers as number[],
      tabMonth,
      tabYear,
    );
    if (!resolvedDates) continue;

    const columnMap: number[] = [];
    let allDaysFound = true;

    for (let weekIdx = 0; weekIdx < weekDays.length; weekIdx += 1) {
      const targetIso = weekDays[weekIdx];
      const column = resolvedDates.findIndex((iso) => iso === targetIso);
      if (column === -1) {
        allDaysFound = false;
        break;
      }
      columnMap.push(column);
    }

    if (!allDaysFound) continue;

    const labelCells = branchDayColumnRows[index + 1] ?? [];
    const sheetDayLabels = labelCells
      .slice(0, SHEETS_DAY_COLUMNS.length)
      .map((cell) => String(cell ?? ''));

    const labelRowHasContent = sheetDayLabels.some((label) => label.trim().length > 0);
    if (labelRowHasContent) {
      let labelsMatch = true;
      for (let weekIdx = 0; weekIdx < weekDays.length; weekIdx += 1) {
        const column = columnMap[weekIdx];
        const cellLabel = sheetDayLabels[column] ?? '';
        const expectedWeekday = parseISO(weekDays[weekIdx]).getDay();
        if (!sheetDayLabelMatchesWeekday(cellLabel, expectedWeekday)) {
          labelsMatch = false;
          break;
        }
      }
      if (!labelsMatch) continue;
    }

    return {
      dateRow: index + 1,
      columnMap,
      sheetDayLabels,
    };
  }

  return null;
}

/** @deprecated Use findWeekBlockInSheet — kept for tests that only need day numbers. */
export function findWeekBlockDateRow(
  branchDayColumnRows: string[][],
  expectedDayNumbers: number[],
): number | null {
  if (expectedDayNumbers.length !== SHEETS_DAY_COLUMNS.length) return null;

  for (let index = 0; index < branchDayColumnRows.length; index += 1) {
    const row = branchDayColumnRows[index];
    if (!row || row.length < SHEETS_DAY_COLUMNS.length) continue;

    let matches = true;
    for (let col = 0; col < SHEETS_DAY_COLUMNS.length; col += 1) {
      const cellDay = parseSheetDayNumber(row[col]);
      if (cellDay !== expectedDayNumbers[col]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return index + 1;
    }
  }

  return null;
}

export function deriveWeekBlockLayout(
  dateRow: number,
  columnMap: number[] = [...DEFAULT_WEEK_COLUMN_MAP],
  sheetDayLabels?: string[],
): SheetsWeekBlockLayout {
  const frontStoreStart = dateRow + SHEETS_LAYOUT_ROW_OFFSETS.frontStoreStart;
  const frontStoreShiftRows = Object.fromEntries(
    SHEETS_FRONT_STORE_SHIFT_KEYS.map((shiftKey, index) => [
      shiftKey,
      frontStoreStart + index * SHEETS_FRONT_STORE_SHIFT_SUBROWS,
    ]),
  ) as Record<SheetsFrontStoreShiftKey, number>;

  return {
    dateRow,
    dayLabelRow: dateRow + SHEETS_LAYOUT_ROW_OFFSETS.dayLabels,
    columnMap,
    sheetDayLabels,
    frontStoreShiftRows,
    frontStoreShiftSubRows: SHEETS_FRONT_STORE_SHIFT_SUBROWS,
    fohCountRow: dateRow + SHEETS_LAYOUT_ROW_OFFSETS.fohCount,
    laundryLabelRow: dateRow + SHEETS_LAYOUT_ROW_OFFSETS.laundryLabel,
    laundryRow: dateRow + SHEETS_LAYOUT_ROW_OFFSETS.laundry,
    branch2Row: dateRow + SHEETS_LAYOUT_ROW_OFFSETS.branch2,
  };
}

export function buildDateRowValuesForSheet(
  weekDays: string[],
  columnMap: number[],
): string[] {
  const dayNumbers = weekDays.map((iso) => String(parseISO(iso).getDate()));
  return mapWeekValuesToSheetColumns(dayNumbers, columnMap);
}

export function buildDayLabelRowValuesForSheet(
  weekDays: string[],
  columnMap: number[],
  sheetDayLabels?: string[],
): string[] {
  return buildDayLabelRowValues(weekDays, columnMap, sheetDayLabels);
}
