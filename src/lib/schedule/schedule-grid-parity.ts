import type { ClientShiftRow } from '@/lib/schedule/client-shift-queries';
import {
  createShiftDateLookup,
  getShiftForProfileDate,
  type ShiftDateLookup,
} from '@/lib/schedule/shift-lookups';

/** Same visibility rule as schedule grid cells (status + location required). */
export function isScheduleGridShiftAssigned(
  shift: ClientShiftRow | undefined,
): shift is ClientShiftRow {
  if (!shift) return false;
  return Boolean(shift.status && shift.metadata?.location);
}

export function createClientShiftDateLookup(
  shifts: ClientShiftRow[],
): ShiftDateLookup<ClientShiftRow> {
  return createShiftDateLookup(shifts);
}

export function resolveScheduleGridShift(
  lookup: ShiftDateLookup<ClientShiftRow>,
  profileId: string,
  dateIso: string,
): ClientShiftRow | undefined {
  return getShiftForProfileDate(lookup, profileId, dateIso);
}
