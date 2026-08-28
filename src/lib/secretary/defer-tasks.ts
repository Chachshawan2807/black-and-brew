import { addBangkokCalendarDays } from '@/lib/date-utils';

export function nextScheduledDateIso(currentDateIso: string): string {
  return addBangkokCalendarDays(currentDateIso, 1);
}
