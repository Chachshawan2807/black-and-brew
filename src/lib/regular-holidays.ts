export const REGULAR_HOLIDAYS_STORAGE_KEY = 'blackandbrew-regular-holidays';

export interface RegularHolidayRow {
  id: string;
  profile_id: string;
  day_of_week: number;
}

export type RegularHolidayMap = Record<string, number[]>;

export function normalizeRegularHolidayDays(days: number[]): number[] {
  return Array.from(
    new Set(
      days
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        .map((day) => Number(day))
    )
  ).sort((a, b) => {
    const normalizedA = a === 0 ? 7 : a;
    const normalizedB = b === 0 ? 7 : b;
    return normalizedA - normalizedB;
  });
}

export function groupRegularHolidayRows(rows: RegularHolidayRow[] | null | undefined): RegularHolidayMap {
  return (rows || []).reduce<RegularHolidayMap>((acc, row) => {
    if (!row?.profile_id) {
      return acc;
    }

    const nextDays = normalizeRegularHolidayDays([
      ...(acc[row.profile_id] || []),
      row.day_of_week,
    ]);

    acc[row.profile_id] = nextDays;
    return acc;
  }, {});
}
