import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { MANAGER_WORK_DAY } from '@/lib/secretary/manager-day-config';

/** Calendar date (yyyy-MM-dd) for the manager work day in Asia/Bangkok. */
export function todayIsoBkk(now = new Date()): string {
  return format(toZonedTime(now, MANAGER_WORK_DAY.timezone), 'yyyy-MM-dd');
}
