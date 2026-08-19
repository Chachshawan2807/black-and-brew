import { getDay } from 'date-fns';

/** Individual roster calendar — Monday-first week. */
export const ROSTER_INDIVIDUAL_DAY_LABELS_SHORT = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'] as const;

export const ROSTER_INDIVIDUAL_DAY_LABELS_FULL = [
  'จันทร์',
  'อังคาร',
  'พุธ',
  'พฤหัสบดี',
  'ศุกร์',
  'เสาร์',
  'อาทิตย์',
] as const;

/** Empty cells before the first date so Monday is column 0. */
export function mondayStartPadCount(date: Date): number {
  return (getDay(date) + 6) % 7;
}
