/** Monthly Google Sheet tab titles — e.g. "ตารางงานเดือน ส.ค. 69" */

export const THAI_MONTH_TAB_ABBREV = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const;

export const MONTHLY_SHEET_TAB_PREFIX = 'ตารางงานเดือน ';

export function buddhistYearShortFromGregorian(year: number): string {
  return String(year + 543).slice(-2);
}

/** Tab title for the month of the week's Monday (`referenceIsoDate` = Monday YYYY-MM-DD). */
export function buildMonthlySheetTabTitle(referenceIsoDate: string): string {
  const date = new Date(referenceIsoDate);
  const monthAbbrev = THAI_MONTH_TAB_ABBREV[date.getMonth()];
  const yearShort = buddhistYearShortFromGregorian(date.getFullYear());
  return `${MONTHLY_SHEET_TAB_PREFIX}${monthAbbrev} ${yearShort}`;
}

export function resolveMonthlySheetTabTitle(
  availableTitles: string[],
  referenceIsoDate: string,
): string | null {
  const expected = buildMonthlySheetTabTitle(referenceIsoDate);
  if (availableTitles.includes(expected)) {
    return expected;
  }

  const date = new Date(referenceIsoDate);
  const monthAbbrev = THAI_MONTH_TAB_ABBREV[date.getMonth()];
  const yearShort = buddhistYearShortFromGregorian(date.getFullYear());

  const fuzzy = availableTitles.find(
    (title) => title.includes(monthAbbrev) && title.includes(yearShort),
  );
  return fuzzy ?? null;
}

/**
 * Tab search order for locating a week block — viewed month first, then Monday month,
 * then Sunday month when the week crosses months.
 */
export function buildMonthlySheetTabSearchOrder(
  availableTitles: string[],
  mondayIso: string,
  sundayIso: string,
  viewedIso?: string,
): string[] {
  const ordered: string[] = [];

  const pushUnique = (isoDate: string) => {
    const tab = resolveMonthlySheetTabTitle(availableTitles, isoDate);
    if (tab && !ordered.includes(tab)) {
      ordered.push(tab);
    }
  };

  if (viewedIso) {
    pushUnique(viewedIso);
  }
  pushUnique(mondayIso);
  if (sundayIso !== mondayIso) {
    pushUnique(sundayIso);
  }

  return ordered;
}

/** Parse Gregorian month (0–11) and year from a monthly tab title. */
export function parseMonthlySheetTabMonthYear(tabTitle: string): { month: number; year: number } | null {
  const prefix = MONTHLY_SHEET_TAB_PREFIX;
  if (!tabTitle.startsWith(prefix)) return null;

  const rest = tabTitle.slice(prefix.length).trim();
  const monthIndex = THAI_MONTH_TAB_ABBREV.findIndex((abbrev) => rest.startsWith(abbrev));
  if (monthIndex === -1) return null;

  const yearMatch = rest.match(/(\d{2})\s*$/);
  if (!yearMatch) return null;

  const buddhistShort = Number.parseInt(yearMatch[1], 10);
  const gregorianYear = buddhistShort + 2500 - 543;

  return { month: monthIndex, year: gregorianYear };
}
