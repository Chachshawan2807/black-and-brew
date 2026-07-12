import {
  DEFAULT_SHIFT_TYPES,
  findShiftTypeByLocation,
  type ShiftTypeEntry,
} from '@/lib/shift-type-config';

interface StaffProfile {
  id: string;
}

interface StaffShift {
  employee_id: string;
  status?: string;
  metadata?: {
    location?: string | null;
  } | null;
}

function normalizeLocation(location: string | null | undefined): string {
  return (location ?? '').replace(/^เข้ากะ\s*/, '').trim();
}

export function isFohCoffeeShift(
  location: string | null | undefined,
  types: ShiftTypeEntry[] = DEFAULT_SHIFT_TYPES,
  status?: string,
): boolean {
  if (status === 'on_leave' || status === 'day_off') return false;

  const loc = normalizeLocation(location);
  if (!loc || loc === 'ลา' || loc === 'วันหยุด') return false;

  const matched = findShiftTypeByLocation(loc, types);
  return matched?.fohCount === true;
}

export function countFohCoffeeStaff(
  profiles: StaffProfile[],
  shifts: StaffShift[],
  types: ShiftTypeEntry[] = DEFAULT_SHIFT_TYPES,
): number {
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const fohEmployeeIds = new Set<string>();

  for (const shift of shifts) {
    if (!shift.employee_id || !profileIds.has(shift.employee_id)) continue;
    if (!isFohCoffeeShift(shift.metadata?.location, types, shift.status)) continue;
    fohEmployeeIds.add(shift.employee_id);
  }

  return fohEmployeeIds.size;
}
