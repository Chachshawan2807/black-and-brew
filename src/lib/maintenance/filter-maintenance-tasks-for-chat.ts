import type { MaintenanceUrgencyGroup, UpcomingMaintenanceTask } from '@/lib/maintenance/types';

const NEAR_TERM_URGENCY: ReadonlySet<MaintenanceUrgencyGroup> = new Set([
  'overdue',
  'within_7_days',
  'within_30_days',
]);

const HORIZON_DURATION_PATTERN = /ภายใน\s*\d+\s*เดือน/i;

const THAI_MONTH_PATTERNS: Array<{ pattern: RegExp; month: number }> = [
  { pattern: /(?:ม\.?\s*ค\.?|มกราคม)/i, month: 1 },
  { pattern: /(?:ก\.?\s*พ\.?|กุมภาพันธ์)/i, month: 2 },
  { pattern: /(?:มี\.?\s*ค\.?|มีนาคม)/i, month: 3 },
  { pattern: /(?:เม\.?\s*ย\.?|เมษายน)/i, month: 4 },
  { pattern: /(?:พ\.?\s*ค\.?|พฤษภาคม)/i, month: 5 },
  { pattern: /(?:มิ\.?\s*ย\.?|มิถุนายน)/i, month: 6 },
  { pattern: /(?:ก\.?\s*ค\.?|กรกฎาคม)/i, month: 7 },
  { pattern: /(?:ส\.?\s*ค\.?|สิงหาคม)/i, month: 8 },
  { pattern: /(?:ก\.?\s*ย\.?|กันยายน)/i, month: 9 },
  { pattern: /(?:ต\.?\s*ค\.?|ตุลาคม)/i, month: 10 },
  { pattern: /(?:พ\.?\s*ย\.?|พฤศจิกายน)/i, month: 11 },
  { pattern: /(?:ธ\.?\s*ค\.?|ธันวาคม)/i, month: 12 },
];

const ENGLISH_MONTH_PATTERNS: Array<{ pattern: RegExp; month: number }> = [
  { pattern: /\bjanuary\b/i, month: 1 },
  { pattern: /\bfebruary\b/i, month: 2 },
  { pattern: /\bmarch\b/i, month: 3 },
  { pattern: /\bapril\b/i, month: 4 },
  { pattern: /\bmay\b/i, month: 5 },
  { pattern: /\bjune\b/i, month: 6 },
  { pattern: /\bjuly\b/i, month: 7 },
  { pattern: /\baugust\b/i, month: 8 },
  { pattern: /\bseptember\b/i, month: 9 },
  { pattern: /\boctober\b/i, month: 10 },
  { pattern: /\bnovember\b/i, month: 11 },
  { pattern: /\bdecember\b/i, month: 12 },
];

export interface MaintenanceTargetMonth {
  year: number;
  month: number;
}

function detectNamedMonth(text: string): number | null {
  for (const { pattern, month } of THAI_MONTH_PATTERNS) {
    if (pattern.test(text)) return month;
  }
  for (const { pattern, month } of ENGLISH_MONTH_PATTERNS) {
    if (pattern.test(text)) return month;
  }
  return null;
}

function detectNumericMonth(text: string): number | null {
  const match = text.match(/(?:เดือน|month)\s*(\d{1,2})\b/i);
  if (!match) return null;

  const month = Number.parseInt(match[1], 10);
  return month >= 1 && month <= 12 ? month : null;
}

function detectExplicitYear(text: string, currentYear: number): number | null {
  const buddhistMatch = text.match(/(?:พ\.?\s*ศ\.?|ปี)\s*(\d{4})/i);
  if (buddhistMatch) {
    const year = Number.parseInt(buddhistMatch[1], 10);
    return year >= 2400 ? year - 543 : year;
  }

  const ceMatch = text.match(/\b(20\d{2})\b/);
  if (ceMatch) {
    return Number.parseInt(ceMatch[1], 10);
  }

  const shortYearMatch = text.match(/(?:พ\.?\s*ศ\.?|ปี)\s*(\d{2})\b/i);
  if (shortYearMatch) {
    const shortYear = Number.parseInt(shortYearMatch[1], 10);
    const asCe = 2000 + shortYear;
    const asBe = 2500 + shortYear - 543;
    return Math.abs(asCe - currentYear) <= Math.abs(asBe - currentYear) ? asCe : asBe;
  }

  return null;
}

function inferTargetYear(
  month: number,
  currentIsoDate: string,
  explicitYear: number | null,
): number {
  if (explicitYear) return explicitYear;

  const currentYear = Number.parseInt(currentIsoDate.slice(0, 4), 10);
  const currentMonth = Number.parseInt(currentIsoDate.slice(5, 7), 10);
  if (month < currentMonth) return currentYear + 1;
  return currentYear;
}

function isDueInCalendarMonth(dueDate: string, year: number, month: number): boolean {
  const [dueYear, dueMonth] = dueDate.split('-').map((part) => Number.parseInt(part, 10));
  return dueYear === year && dueMonth === month;
}

export function parseMaintenanceTargetMonth(
  query: string,
  currentIsoDate: string,
): MaintenanceTargetMonth | null {
  if (HORIZON_DURATION_PATTERN.test(query)) {
    return null;
  }

  const month = detectNamedMonth(query) ?? detectNumericMonth(query);
  if (!month) return null;

  const currentYear = Number.parseInt(currentIsoDate.slice(0, 4), 10);
  const year = inferTargetYear(month, currentIsoDate, detectExplicitYear(query, currentYear));

  return { year, month };
}

export function filterMaintenanceTasksForChat(
  tasks: UpcomingMaintenanceTask[],
  query: string,
  currentIsoDate: string,
): UpcomingMaintenanceTask[] {
  const targetMonth = parseMaintenanceTargetMonth(query, currentIsoDate);

  if (!targetMonth) {
    return tasks.filter((task) => NEAR_TERM_URGENCY.has(task.urgency));
  }

  const { year, month } = targetMonth;
  return tasks.filter(
    (task) =>
      task.urgency === 'overdue' ||
      isDueInCalendarMonth(task.dueDate, year, month),
  );
}
