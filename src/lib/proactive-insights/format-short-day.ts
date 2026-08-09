import { parseISO } from 'date-fns';
import { THAI_DAY_LABELS } from '@/lib/proactive-insights/week-schedule';

/** Abbreviated Thai weekday + day-of-month only (e.g. "จ. 21"). */
export function formatShortDayDate(dateIso: string, dayIndex: number): string {
  const parsed = parseISO(dateIso);
  const dayNum = Number.isNaN(parsed.getTime()) ? '?' : String(parsed.getDate());
  const label = THAI_DAY_LABELS[dayIndex] ?? '';
  return `${label} ${dayNum}`.trim();
}
