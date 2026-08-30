import { parseISO } from 'date-fns';
import { THAI_DAY_LABELS } from '@/lib/proactive-insights/week-schedule';

/** Abbreviated Thai weekday + day-of-month only (e.g. "จ. 21"). */
export function formatShortDayDate(dateIso: string, dayIndex: number): string {
  const parsed = parseISO(dateIso);
  const dayNum = Number.isNaN(parsed.getTime()) ? '?' : String(parsed.getDate());
  const label = THAI_DAY_LABELS[dayIndex] ?? '';
  return `${label} ${dayNum}`.trim();
}

/** Abbreviated Thai weekday + day-of-month with "ที่" (e.g. "พ. ที่ 2"). */
export function formatShortDayDateWithAt(dateIso: string, dayIndex: number): string {
  const parsed = parseISO(dateIso);
  const dayNum = Number.isNaN(parsed.getTime()) ? '?' : String(parsed.getDate());
  const label = THAI_DAY_LABELS[dayIndex] ?? '';
  return `${label} ที่ ${dayNum}`.trim();
}

/** Understaffed day line for secretary cards and insight summaries (e.g. "พ. ที่ 2 (4 คน)"). */
export function formatUnderstaffedDaySummary(
  dateIso: string,
  dayIndex: number,
  headcount: number,
): string {
  return `${formatShortDayDateWithAt(dateIso, dayIndex)} (${headcount} คน)`;
}

/** Leave coverage grouped by date (e.g. "ศ. ที่ 24 (เอ, บี), ส. ที่ 25 (ซี)"). */
export function formatLeaveCoverageSummary(
  entries: Array<{ name: string; dateIso: string; dayIndex: number }>,
): string {
  const byDate = new Map<string, { dayIndex: number; names: string[] }>();

  for (const entry of entries) {
    const existing = byDate.get(entry.dateIso);
    if (existing) {
      existing.names.push(entry.name);
      continue;
    }
    byDate.set(entry.dateIso, { dayIndex: entry.dayIndex, names: [entry.name] });
  }

  return [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([dateIso, { dayIndex, names }]) =>
        `${formatShortDayDateWithAt(dateIso, dayIndex)} (${names.join(', ')})`,
    )
    .join(', ');
}
