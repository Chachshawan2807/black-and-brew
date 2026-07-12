import { describe, expect, it } from 'vitest';
import { countFohCoffeeStaff, isFohCoffeeShift } from '@/lib/foh-coffee-staff-count';
import { DEFAULT_SHIFT_TYPES } from '@/lib/shift-type-config';

const profiles = [
  { id: 'p1', full_name: 'ปิ่น' },
  { id: 'p2', full_name: 'เม' },
  { id: 'p3', full_name: 'มุก' },
  { id: 'p4', full_name: 'นิต้า' },
  { id: 'p5', full_name: 'แป้ง' },
];

describe('isFohCoffeeShift', () => {
  it('returns true for 6:30, 7:00, 8:00 and alias times', () => {
    expect(isFohCoffeeShift('6:30', DEFAULT_SHIFT_TYPES)).toBe(true);
    expect(isFohCoffeeShift('07:00', DEFAULT_SHIFT_TYPES)).toBe(true);
    expect(isFohCoffeeShift('เข้ากะ 8:00', DEFAULT_SHIFT_TYPES)).toBe(true);
  });

  it('returns false for other duties, leave, and later shifts', () => {
    expect(isFohCoffeeShift('9:00', DEFAULT_SHIFT_TYPES)).toBe(false);
    expect(isFohCoffeeShift('ร้านซักผ้า', DEFAULT_SHIFT_TYPES)).toBe(false);
    expect(isFohCoffeeShift('ลา', DEFAULT_SHIFT_TYPES, 'on_leave')).toBe(false);
    expect(isFohCoffeeShift('6:30', DEFAULT_SHIFT_TYPES, 'day_off')).toBe(false);
  });
});

describe('countFohCoffeeStaff', () => {
  it('counts only employees on 6:30 / 7:00 / 8:00 coffee-shop shifts', () => {
    const shifts = [
      { employee_id: 'p1', status: 'scheduled', metadata: { location: '6:30' } },
      { employee_id: 'p2', status: 'scheduled', metadata: { location: '7:00' } },
      { employee_id: 'p3', status: 'scheduled', metadata: { location: '9:00' } },
      { employee_id: 'p4', status: 'scheduled', metadata: { location: 'ร้านซักผ้า' } },
      { employee_id: 'p5', status: 'on_leave', metadata: { location: '8:00' } },
    ];

    expect(countFohCoffeeStaff(profiles, shifts, DEFAULT_SHIFT_TYPES)).toBe(2);
  });

  it('deduplicates multiple shift rows for the same employee', () => {
    const shifts = [
      { employee_id: 'p1', status: 'scheduled', metadata: { location: '6:30' } },
      { employee_id: 'p1', status: 'scheduled', metadata: { location: '6:30' } },
    ];

    expect(countFohCoffeeStaff(profiles.slice(0, 1), shifts, DEFAULT_SHIFT_TYPES)).toBe(1);
  });
});
