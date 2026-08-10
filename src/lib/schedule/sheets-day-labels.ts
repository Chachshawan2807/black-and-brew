/** Thai weekday abbreviations used on BAB schedule sheets (flexible matching). */

export const SHEETS_THAI_WEEKDAY_LABELS: Record<number, readonly string[]> = {
  0: ['อา', 'อา.', 'อาทิตย์', 'อาทิตย', 'อาทิต', 'อาทิตย์์', 'Sunday', 'Sun'],
  1: ['จ', 'จ.', 'จันทร์', 'จันท', 'Monday', 'Mon'],
  2: ['อ', 'อ.', 'อังคาร', 'อังค', 'Tuesday', 'Tue', 'Tues'],
  3: ['พ', 'พ.', 'พุธ', 'Wednesday', 'Wed'],
  4: ['พฤ', 'พฤ.', 'พฤหัส', 'พฤหัสบดี', 'พฤหัสบ', 'Thursday', 'Thu', 'Thur'],
  5: ['ศ', 'ศ.', 'ศุกร์', 'ศุก', 'Friday', 'Fri'],
  6: ['ส', 'ส.', 'เสาร์', 'เสาร', 'เสา', 'Saturday', 'Sat'],
};

export function normalizeThaiDayLabelToken(raw: string): string {
  return raw
    .trim()
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\s.·,，、:：/\\|_-]/g, '')
    .toLowerCase();
}

const LABEL_MATCH_ENTRIES = Object.entries(SHEETS_THAI_WEEKDAY_LABELS).flatMap(([dow, labels]) =>
  labels.map((label) => ({
    dow: Number(dow),
    normalized: normalizeThaiDayLabelToken(label),
  })),
).sort((a, b) => b.normalized.length - a.normalized.length);

/**
 * Parse a sheet day label to JS weekday (0=Sun … 6=Sat).
 * Uses longest-match first so e.g. พฤหัส does not read as พ (Wed).
 */
export function thaiDayLabelToWeekday(raw: string): number | null {
  const token = normalizeThaiDayLabelToken(raw);
  if (!token) return null;

  for (const entry of LABEL_MATCH_ENTRIES) {
    if (!entry.normalized) continue;

    if (token === entry.normalized) {
      return entry.dow;
    }

    if (entry.normalized.length >= 2 && token.startsWith(entry.normalized)) {
      return entry.dow;
    }

    if (token.length >= 2 && entry.normalized.startsWith(token)) {
      return entry.dow;
    }
  }

  return null;
}

/** True when label is empty, unrecognised, or matches the expected weekday. */
export function sheetDayLabelMatchesWeekday(raw: string, expectedWeekday: number): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;

  const parsed = thaiDayLabelToWeekday(trimmed);
  if (parsed === null) return true;

  return parsed === expectedWeekday;
}

export function sheetDayLabelForWeekday(weekday: number, preferred?: string): string {
  const trimmed = preferred?.trim();
  if (trimmed) return trimmed;
  const labels = SHEETS_THAI_WEEKDAY_LABELS[weekday];
  return labels[0] ?? '';
}
