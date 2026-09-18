import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

/** Resolve Bangkok calendar date for the daily 07:00 ICT insight cron. */
export function resolveInsightTargetDateIso(now: Date = new Date()): string {
  const bkk = toZonedTime(now, 'Asia/Bangkok');
  return format(bkk, 'yyyy-MM-dd');
}
