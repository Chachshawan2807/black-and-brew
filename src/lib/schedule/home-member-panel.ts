import type { HomeShiftProfile } from '@/lib/schedule/home-shift-status';
import type { ClientShiftRow } from '@/lib/schedule/client-shift-queries';
import type {
  HomeDutySummary,
  HomeOffOrLeaveRow,
} from '@/lib/schedule/home-day-roster';
import { getBangkokCalendarDayQueryBounds } from '@/lib/date-utils';

/** Serializable home "คนและกะวันนี้" payload (SSR, actions, client). */
export type HomeMemberPanelSnapshot = {
  dateIso: string;
  profiles: HomeShiftProfile[];
  shifts: ClientShiftRow[];
  tomorrowDateIso: string;
  tomorrowShifts: ClientShiftRow[];
  leaveRows?: HomeOffOrLeaveRow[];
  dutySummary?: HomeDutySummary;
};

/** Split a single inclusive date-range query without changing its original rows. */
export function splitHomeMemberPanelShifts<T extends { start_time: string }>(
  rows: T[],
  dateIso: string,
  tomorrowDateIso: string,
): { shifts: T[]; tomorrowShifts: T[] } {
  const todayBounds = getBangkokCalendarDayQueryBounds(dateIso);
  const tomorrowBounds = getBangkokCalendarDayQueryBounds(tomorrowDateIso);
  const todayStart = Date.parse(todayBounds.startInclusive);
  const todayEnd = Date.parse(todayBounds.endInclusive);
  const tomorrowStart = Date.parse(tomorrowBounds.startInclusive);
  const tomorrowEnd = Date.parse(tomorrowBounds.endInclusive);
  const shifts: T[] = [];
  const tomorrowShifts: T[] = [];

  for (const row of rows) {
    const startedAt = Date.parse(row.start_time);
    if (startedAt >= todayStart && startedAt <= todayEnd) {
      shifts.push(row);
    } else if (startedAt >= tomorrowStart && startedAt <= tomorrowEnd) {
      tomorrowShifts.push(row);
    }
  }

  return { shifts, tomorrowShifts };
}
