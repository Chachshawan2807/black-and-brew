/** Google Sheet cell mapping branch 1 only (columns A–H). Column I+ is branch 2. */

export const SHEETS_BRANCH1_LABEL_COLUMN = 'A' as const;

/** Branch 1 day columns (Mon–Sun). Never write to J–Q (branch 2). */
export const SHEETS_DAY_COLUMNS = ['B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

export const SHEETS_BRANCH1_COLUMN_RANGE = 'A:H' as const;

export const SHEETS_DAY_LABELS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'] as const;

/** Front-store shift buckets written to the sheet (order matters). */
export const SHEETS_FRONT_STORE_SHIFT_KEYS = ['6:30', '7:00', '8:00'] as const;

export type SheetsFrontStoreShiftKey = (typeof SHEETS_FRONT_STORE_SHIFT_KEYS)[number];

/** Name slot rows per front-store shift block (matches BAB sheet template). */
export const SHEETS_FRONT_STORE_SHIFT_SLOT_ROWS: Record<SheetsFrontStoreShiftKey, number> = {
  '6:30': 2,
  '7:00': 3,
  '8:00': 4,
};

const FRONT_STORE_TOTAL_SLOT_ROWS = SHEETS_FRONT_STORE_SHIFT_KEYS.reduce(
  (sum, shiftKey) => sum + SHEETS_FRONT_STORE_SHIFT_SLOT_ROWS[shiftKey],
  0,
);

/** Row offsets from the week’s date-number row within each weekly block. */
export const SHEETS_LAYOUT_ROW_OFFSETS = {
  dayLabels: 1,
  /** First row of the front-store section (6:30 label row). */
  frontStoreStart: 2,
  fohCount: 2 + FRONT_STORE_TOTAL_SLOT_ROWS,
  laundryLabel: 2 + FRONT_STORE_TOTAL_SLOT_ROWS + 1,
  laundry: 2 + FRONT_STORE_TOTAL_SLOT_ROWS + 2,
  branch2: 2 + FRONT_STORE_TOTAL_SLOT_ROWS + 3,
} as const;

/** @deprecated Use SHEETS_FRONT_STORE_SHIFT_SLOT_ROWS */
export const SHEETS_FRONT_STORE_SHIFT_SUBROWS = SHEETS_FRONT_STORE_SHIFT_SLOT_ROWS['6:30'];

/** Max rows scanned per monthly tab when locating a week block. */
export const SHEETS_WEEK_BLOCK_SCAN_MAX_ROW = 500;

export const SHEETS_SHIFT_TIME_LABELS: Record<SheetsFrontStoreShiftKey, string> = {
  '6:30': '06:30 - 15:30',
  '7:00': '07:00 - 16:00',
  '8:00': '8:00 - 17:00',
};

export const SHEETS_ROW_LABELS = {
  laundry: 'ร้านซักผ้า',
  branch2: 'ไปสาขา 2',
} as const;
