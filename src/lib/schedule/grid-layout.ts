/** Employee name column — min fits drag handle, short Thai names, and right-aligned delete control. */
export const SCHEDULE_NAME_COLUMN_MIN = '168px';
export const SCHEDULE_DAY_COLUMN_MIN = '104px';

export const SCHEDULE_GRID_TEMPLATE = `minmax(${SCHEDULE_NAME_COLUMN_MIN}, max-content) repeat(7, minmax(${SCHEDULE_DAY_COLUMN_MIN}, 1fr))`;

/** Minimum horizontal scroll width for the weekly schedule table. */
export const SCHEDULE_TABLE_MIN_WIDTH = '920px';
