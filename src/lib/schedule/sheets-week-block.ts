import { addDays, format, startOfWeek } from 'date-fns';
import {
  SHEETS_DAY_COLUMNS,
  SHEETS_LAYOUT_ROW_OFFSETS,
} from '@/lib/schedule/sheets-layout-config';

export interface SheetsWeekBlockLayout {
  dateRow: number;
  dayLabelRow: number;
  frontStoreShiftRows: Record<'6:30' | '7:00' | '8:00', number>;
  fohCountRow: number;
  laundryLabelRow: number;
  laundryRow: number;
  branch2Row: number;
}

export function buildWeekDayIsoStrings(weekStartMonday: string): string[] {
  const monday = startOfWeek(new Date(weekStartMonday), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) =>
    format(addDays(monday, index), 'yyyy-MM-dd'),
  );
}

export function weekDayNumbersFromIsoDates(weekDays: string[]): number[] {
  return weekDays.map((isoDate) => new Date(isoDate).getDate());
}

function parseSheetDayNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

/** Match a date-number row in branch-1 day columns (B–H). */
export function findWeekBlockDateRow(
  branchDayColumnRows: string[][],
  expectedDayNumbers: number[],
): number | null {
  if (expectedDayNumbers.length !== SHEETS_DAY_COLUMNS.length) {
    return null;
  }

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

export function deriveWeekBlockLayout(dateRow: number): SheetsWeekBlockLayout {
  return {
    dateRow,
    dayLabelRow: dateRow + SHEETS_LAYOUT_ROW_OFFSETS.dayLabels,
    frontStoreShiftRows: {
      '6:30': dateRow + SHEETS_LAYOUT_ROW_OFFSETS.frontStoreShifts['6:30'],
      '7:00': dateRow + SHEETS_LAYOUT_ROW_OFFSETS.frontStoreShifts['7:00'],
      '8:00': dateRow + SHEETS_LAYOUT_ROW_OFFSETS.frontStoreShifts['8:00'],
    },
    fohCountRow: dateRow + SHEETS_LAYOUT_ROW_OFFSETS.fohCount,
    laundryLabelRow: dateRow + SHEETS_LAYOUT_ROW_OFFSETS.laundryLabel,
    laundryRow: dateRow + SHEETS_LAYOUT_ROW_OFFSETS.laundry,
    branch2Row: dateRow + SHEETS_LAYOUT_ROW_OFFSETS.branch2,
  };
}
