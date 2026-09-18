import { formatInTimeZone } from 'date-fns-tz';
import { addBangkokCalendarDays, getBangkokCalendarIso } from '@/lib/date-utils';
import { THAI_TIMEZONE } from '@/lib/timezone';
import type { DailyReportSchedule } from '@/lib/daily-report/types';

/** Evening cron boundary in Asia/Bangkok (18:00 ICT → tomorrow's schedule). */
const EVENING_SCHEDULE_HOUR_ICT = 18;

/** Validates cron-job.org `?schedule=` values. */
export function parseDailyReportScheduleParam(
  explicit: string | null,
): DailyReportSchedule | null {
  if (explicit === 'tomorrow' || explicit === 'today') return explicit;
  return null;
}

/**
 * Bangkok calendar date (yyyy-MM-dd) covered by the notification.
 * Independent of server timezone safe on Vercel (UTC).
 */
export function resolveDailyReportTargetIso(
  schedule: DailyReportSchedule,
  now: Date = new Date(),
): string {
  const todayIso = getBangkokCalendarIso(now);
  return schedule === 'tomorrow' ? addBangkokCalendarDays(todayIso, 1) : todayIso;
}

/**
 * Resolves which day's schedule the notification should cover.
 *
 * cron-job.org jobs should pass explicit `?schedule=`:
 * - 05:00 ICT → `?schedule=today`
 * - 18:00 ICT → `?schedule=tomorrow`
 *
 * When omitted, infers from Bangkok wall-clock hour (fallback only).
 */
export function resolveDailyReportSchedule(
  explicit: string | null,
  now: Date = new Date(),
): DailyReportSchedule {
  const parsed = parseDailyReportScheduleParam(explicit);
  if (parsed) return parsed;

  const bkkHour = Number(formatInTimeZone(now, THAI_TIMEZONE, 'H'));
  return bkkHour >= EVENING_SCHEDULE_HOUR_ICT ? 'tomorrow' : 'today';
}
