import { formatInTimeZone } from 'date-fns-tz';
import { THAI_TIMEZONE } from '@/lib/timezone';

/** Daily proactive insight digest morning push is scheduled at 07:00 ICT. */
export const INSIGHT_DAILY_CRON_ICT_HOUR = 7;
export const INSIGHT_EVENING_CRON_ICT_HOUR = 17;

export type InsightAlertWindow = 'morning' | 'evening';

export const INSIGHT_CRON_SCHEDULES: Record<
  InsightAlertWindow,
  { hour: number; minute: number }
> = {
  morning: { hour: INSIGHT_DAILY_CRON_ICT_HOUR, minute: 0 },
  evening: { hour: INSIGHT_EVENING_CRON_ICT_HOUR, minute: 0 },
};

/** Allowed drift from the configured cron minute (cron-job.org queue + cold start). */
export const INSIGHT_CRON_TOLERANCE_MINUTES = 10;

export function parseInsightAlertWindow(param: string | null | undefined): InsightAlertWindow {
  if (param === 'evening') return 'evening';
  return 'morning';
}

function bangkokMinutesSinceMidnight(now: Date): number {
  const hour = Number(formatInTimeZone(now, THAI_TIMEZONE, 'H'));
  const minute = Number(formatInTimeZone(now, THAI_TIMEZONE, 'm'));
  return hour * 60 + minute;
}

export function formatBangkokTime(now = new Date()): string {
  return formatInTimeZone(now, THAI_TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

/** True when `now` is within tolerance of the configured cron-job.org schedule. */
export function isWithinInsightCronWindow(
  window: InsightAlertWindow,
  now = new Date(),
): boolean {
  const { hour, minute } = INSIGHT_CRON_SCHEDULES[window];
  const scheduledMinutes = hour * 60 + minute;
  const currentMinutes = bangkokMinutesSinceMidnight(now);
  const diff = Math.abs(currentMinutes - scheduledMinutes);
  return diff <= INSIGHT_CRON_TOLERANCE_MINUTES;
}

export function resolveInsightCronOccurredAt(dateIso: string): string {
  return `${dateIso}T00:00:00.000Z`;
}
