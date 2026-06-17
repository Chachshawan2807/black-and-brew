import { describe, expect, it } from 'vitest';

import {
  createShiftDateLookup,
  createShiftTypeLookup,
  getShiftForProfileDate,
  getShiftTypeForLocation,
} from '@/lib/schedule/shift-lookups';

describe('schedule shift lookup helpers', () => {
  const shifts = [
    {
      id: 'shift-1',
      employee_id: 'profile-1',
      start_time: '2026-06-15T09:00:00+07:00',
      metadata: { location: 'bar' },
    },
    {
      id: 'shift-2',
      profile_id: 'profile-2',
      start_time: '2026-06-16T09:00:00+07:00',
      metadata: { location: 'cashier' },
    },
  ];

  const shiftTypes = [
    { value: 'bar', label: 'Bar', className: 'bar-class' },
    { value: 'cashier', label: 'Cashier', className: 'cashier-class' },
  ];

  it('indexes shifts by profile id and date without changing fallback profile_id behavior', () => {
    const lookup = createShiftDateLookup(shifts);

    expect(getShiftForProfileDate(lookup, 'profile-1', '2026-06-15')).toBe(shifts[0]);
    expect(getShiftForProfileDate(lookup, 'profile-2', '2026-06-16')).toBe(shifts[1]);
    expect(getShiftForProfileDate(lookup, 'profile-2', '2026-06-15')).toBeUndefined();
  });

  it('indexes shift types by location value', () => {
    const lookup = createShiftTypeLookup(shiftTypes);

    expect(getShiftTypeForLocation(lookup, 'bar')).toBe(shiftTypes[0]);
    expect(getShiftTypeForLocation(lookup, 'missing')).toBeUndefined();
    expect(getShiftTypeForLocation(lookup, undefined)).toBeUndefined();
  });
});
