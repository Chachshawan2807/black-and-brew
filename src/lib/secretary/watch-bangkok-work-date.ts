import { addDays, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { MANAGER_WORK_DAY } from '@/lib/secretary/manager-day-config';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';

export function msUntilNextBangkokMidnight(now = new Date()): number {
  const bkkNow = toZonedTime(now, MANAGER_WORK_DAY.timezone);
  const nextMidnight = startOfDay(addDays(bkkNow, 1));
  const nextUtc = fromZonedTime(nextMidnight, MANAGER_WORK_DAY.timezone);
  return Math.max(1_000, nextUtc.getTime() - now.getTime());
}

/** Calls `onDateChange` when the Bangkok calendar day rolls over (midnight + 60s poll). */
export function watchBangkokWorkDate(onDateChange: (dateIso: string) => void): () => void {
  let current = todayIsoBkk();
  let midnightTimer: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const check = () => {
    const next = todayIsoBkk();
    if (next !== current) {
      current = next;
      onDateChange(next);
    }
    scheduleMidnight();
  };

  const scheduleMidnight = () => {
    if (midnightTimer) clearTimeout(midnightTimer);
    midnightTimer = setTimeout(check, msUntilNextBangkokMidnight());
  };

  scheduleMidnight();
  pollTimer = setInterval(check, 60_000);

  return () => {
    if (midnightTimer) clearTimeout(midnightTimer);
    if (pollTimer) clearInterval(pollTimer);
  };
}
