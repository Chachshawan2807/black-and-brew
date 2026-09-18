import type { ClientShiftRow } from '@/lib/schedule/client-shift-queries';
import {
  categorizeShift,
  normalizeShiftLocation,
} from '@/lib/schedule/format-daily-shifts';
import type { HomeShiftProfile } from '@/lib/schedule/home-shift-status';
import {
  createClientShiftDateLookup,
  isScheduleGridShiftAssigned,
  resolveScheduleGridShift,
} from '@/lib/schedule/schedule-grid-parity';
import { getLeaveRemark } from '@/lib/dashboard/leave-details';
import { getWeekDateIsos, isDayUnderstaffed } from '@/lib/proactive-insights/week-schedule';

export type HomeOffOrLeaveKind = 'leave' | 'day_off';

export type HomeOffOrLeaveRow = {
  profileId: string;
  fullName: string;
  scheduleOrder: number;
  kind: HomeOffOrLeaveKind;
  label: string;
  remark?: string;
};

export type HomeDutySummary = {
  frontStoreCount: number;
  otherDutyCount: number;
  leaveCount: number;
  dayOffCount: number;
  isUnderstaffedToday: boolean;
};

function resolveDayIndex(dateIso: string): number {
  const index = getWeekDateIsos(dateIso).indexOf(dateIso);
  return index >= 0 ? index : 0;
}

function resolveAssignedShiftLabel(
  profiles: HomeShiftProfile[],
  shifts: ClientShiftRow[],
  dateIso: string,
): Array<{
  profile: HomeShiftProfile;
  shiftLabel: string;
  shift: ClientShiftRow;
}> {
  const lookup = createClientShiftDateLookup(shifts);
  const assigned: Array<{
    profile: HomeShiftProfile;
    shiftLabel: string;
    shift: ClientShiftRow;
  }> = [];

  for (const profile of profiles) {
    const shift = resolveScheduleGridShift(lookup, profile.id, dateIso);
    if (!isScheduleGridShiftAssigned(shift) || !shift) continue;

    const shiftLabel = normalizeShiftLocation(shift.metadata?.location, shift.status);
    assigned.push({ profile, shiftLabel, shift });
  }

  return assigned;
}

export function buildHomeLeaveRows(
  profiles: HomeShiftProfile[],
  shifts: ClientShiftRow[],
  dateIso: string,
): HomeOffOrLeaveRow[] {
  const rows: HomeOffOrLeaveRow[] = [];

  for (const { profile, shiftLabel, shift } of resolveAssignedShiftLabel(
    profiles,
    shifts,
    dateIso,
  )) {
    if (categorizeShift(shiftLabel) !== 'off_or_leave') continue;

    const kind: HomeOffOrLeaveKind = shiftLabel === 'ลา' ? 'leave' : 'day_off';
    const label = kind === 'leave' ? 'ลา' : 'วันหยุด';
    const remark = getLeaveRemark(shift) || undefined;

    rows.push({
      profileId: profile.id,
      fullName: profile.full_name,
      scheduleOrder: profile.schedule_order,
      kind,
      label,
      remark: remark || undefined,
    });
  }

  return rows.sort((a, b) => {
    if (a.scheduleOrder !== b.scheduleOrder) return a.scheduleOrder - b.scheduleOrder;
    return a.fullName.localeCompare(b.fullName, 'th');
  });
}

export function buildHomeDutySummary(
  profiles: HomeShiftProfile[],
  shifts: ClientShiftRow[],
  dateIso: string,
  opts?: { isPublicHoliday?: boolean },
): HomeDutySummary {
  let frontStoreCount = 0;
  let otherDutyCount = 0;
  let leaveCount = 0;
  let dayOffCount = 0;

  for (const { shiftLabel } of resolveAssignedShiftLabel(profiles, shifts, dateIso)) {
    const category = categorizeShift(shiftLabel);
    if (category === 'front_store') {
      frontStoreCount += 1;
      continue;
    }
    if (category === 'other_duty') {
      otherDutyCount += 1;
      continue;
    }
    if (shiftLabel === 'ลา') {
      leaveCount += 1;
    } else {
      dayOffCount += 1;
    }
  }

  const isUnderstaffedToday = isDayUnderstaffed({
    dayIndex: resolveDayIndex(dateIso),
    headcount: frontStoreCount,
    isPublicHoliday: opts?.isPublicHoliday ?? false,
  });

  return {
    frontStoreCount,
    otherDutyCount,
    leaveCount,
    dayOffCount,
    isUnderstaffedToday,
  };
}

export function formatHomeDutySummaryLine(summary: HomeDutySummary): string {
  return [
    `กะหน้าร้าน ${summary.frontStoreCount}`,
    `ลา ${summary.leaveCount}`,
    `หน้าที่อื่น ${summary.otherDutyCount}`,
  ].join(' · ');
}
