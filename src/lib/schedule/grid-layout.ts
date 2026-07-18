/** Employee name column — drag handle + short Thai names (compact, touch-safe). */
export const SCHEDULE_NAME_COLUMN_MIN = '112px';
/** PNG export — drag handle hidden; column fits name text only. */
export const SCHEDULE_EXPORT_NAME_COLUMN_MIN = '80px';
export const SCHEDULE_DAY_COLUMN_MIN = '104px';

/** PNG export — fixed column widths so every row shares the same grid (no per-row drift). */
export const SCHEDULE_EXPORT_NAME_COLUMN_WIDTH = '88px';
export const SCHEDULE_EXPORT_DAY_COLUMN_WIDTH = '92px';

export const SCHEDULE_GRID_TEMPLATE = `minmax(${SCHEDULE_NAME_COLUMN_MIN}, max-content) repeat(7, minmax(${SCHEDULE_DAY_COLUMN_MIN}, 1fr))`;

/** Fallback when layout measurement is unavailable (e.g. jsdom). */
export const SCHEDULE_EXPORT_GRID_TEMPLATE = `${SCHEDULE_EXPORT_NAME_COLUMN_WIDTH} repeat(7, ${SCHEDULE_EXPORT_DAY_COLUMN_WIDTH})`;

/** Total export table width — fixed so long holiday text cannot widen the PNG. */
export const SCHEDULE_EXPORT_TABLE_WIDTH = `${
  parseInt(SCHEDULE_EXPORT_NAME_COLUMN_WIDTH, 10) +
  7 * parseInt(SCHEDULE_EXPORT_DAY_COLUMN_WIDTH, 10)
}px`;

/** PNG export — public-holiday labels may wrap up to 4 lines (14px / leading-snug). */
export const SCHEDULE_EXPORT_HOLIDAY_LINE_CLAMP = 4;
export const SCHEDULE_EXPORT_HOLIDAY_MIN_HEIGHT = '88px';

/** Minimum horizontal scroll width for the weekly schedule table. */
export const SCHEDULE_TABLE_MIN_WIDTH = '880px';
