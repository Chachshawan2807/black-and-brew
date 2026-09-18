import type { ClientShiftRow } from '@/lib/schedule/client-shift-queries';
import {
  categorizeShift,
  normalizeShiftLocation,
} from '@/lib/schedule/format-daily-shifts';
import {
  buildTimedShiftEndInstant,
  buildTimedShiftStartInstant,
  formatShiftClockLabel,
  formatTimedShiftWindowLabel,
  parseTimedShiftLabel,
  resolveShiftCountdownPhase,
  type ShiftCountdownPhase,
} from '@/lib/schedule/shift-work-countdown';
import {
  getShiftColorClass,
  getShiftColorStyle,
  type ShiftColorStyle,
} from '@/lib/shift-colors';

export interface HomeShiftProfile {
  id: string;
  full_name: string;
  schedule_order: number;
}

export interface HomeShiftStatusRow {
  profileId: string;
  fullName: string;
  scheduleOrder: number;
  shiftLabel: string;
  isTimedShift: boolean;
  colorClass: string;
  colorStyle?: ShiftColorStyle;
  sortTime: number;
  shiftStart?: Date;
  shiftEnd?: Date;
  /** e.g. `6:30 - 15:30` for timed front-store shifts */
  timedWindowLabel?: string;
}

function findPrimaryWorkShift(employeeId: string, shifts: ClientShiftRow[]): ClientShiftRow | null {
  const employeeShifts = shifts.filter((entry) => entry.employee_id === employeeId);
  if (employeeShifts.some((entry) => entry.status === 'day_off')) return null;
  return employeeShifts.find((entry) => entry.status !== 'day_off') ?? null;
}

function resolveSortTime(dateIso: string, shiftLabel: string): number {
  const timed = parseTimedShiftLabel(shiftLabel);
  if (!timed) return Number.MAX_SAFE_INTEGER;
  return buildTimedShiftStartInstant(dateIso, timed.hours, timed.minutes).getTime();
}

export function buildHomeShiftStatusRows(
  profiles: HomeShiftProfile[],
  shifts: ClientShiftRow[],
  dateIso: string,
): HomeShiftStatusRow[] {
  const rows: HomeShiftStatusRow[] = [];

  for (const profile of profiles) {
    const shift = findPrimaryWorkShift(profile.id, shifts);
    if (!shift) continue;

    const shiftLabel = normalizeShiftLocation(shift.metadata?.location, shift.status);
    const category = categorizeShift(shiftLabel);
    if (category !== 'front_store') continue;

    const timed = parseTimedShiftLabel(shiftLabel);
    if (!timed) continue;

    const locationRaw = shift.metadata?.location ?? shiftLabel;
    const isTimedShift = true;

    rows.push({
      profileId: profile.id,
      fullName: profile.full_name,
      scheduleOrder: profile.schedule_order,
      shiftLabel,
      isTimedShift,
      colorClass: getShiftColorClass(locationRaw, shift.status),
      colorStyle: getShiftColorStyle(locationRaw, shift.status),
      sortTime: resolveSortTime(dateIso, shiftLabel),
      shiftStart: timed
        ? buildTimedShiftStartInstant(dateIso, timed.hours, timed.minutes)
        : undefined,
      shiftEnd: timed
        ? buildTimedShiftEndInstant(dateIso, timed.hours, timed.minutes)
        : undefined,
      timedWindowLabel: isTimedShift
        ? (formatTimedShiftWindowLabel(shiftLabel, dateIso) ?? undefined)
        : undefined,
    });
  }

  return rows.sort((a, b) => {
    if (a.sortTime !== b.sortTime) return a.sortTime - b.sortTime;
    return a.scheduleOrder - b.scheduleOrder;
  });
}

export function resolveTimedShiftCountdownView(
  row: HomeShiftStatusRow,
  now: Date,
): {
  phase: ShiftCountdownPhase;
  countdownMs: number;
  endLabel: string;
} | null {
  if (!row.isTimedShift || !row.shiftStart || !row.shiftEnd) return null;

  const phase = resolveShiftCountdownPhase(now, row.shiftStart, row.shiftEnd);
  const target = phase === 'before' ? row.shiftStart : row.shiftEnd;

  return {
    phase,
    countdownMs: Math.max(0, target.getTime() - now.getTime()),
    endLabel: formatShiftClockLabel(row.shiftEnd),
  };
}
