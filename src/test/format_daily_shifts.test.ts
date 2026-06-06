import { describe, expect, test } from 'vitest';
import { formatDailyShifts, normalizeShiftLocation } from '@/lib/schedule/format-daily-shifts';

const profiles = [
  { id: 'p1', full_name: 'มุก', schedule_order: 1 },
  { id: 'p2', full_name: 'ปิ่น', schedule_order: 2 },
  { id: 'p3', full_name: 'เม', schedule_order: 3 },
  { id: 'p4', full_name: 'ฟิว', schedule_order: 4 },
  { id: 'p5', full_name: 'ล่า', schedule_order: 5 },
  { id: 'p6', full_name: 'นิต้า', schedule_order: 6 },
  { id: 'p7', full_name: 'มีนา', schedule_order: 7 },
  { id: 'p8', full_name: 'หนูดี', schedule_order: 8 },
  { id: 'p9', full_name: 'ชัช', schedule_order: 9 },
];

describe('formatDailyShifts', () => {
  test('uses metadata.location as shift type, not start_time', () => {
    const shifts = [
      { employee_id: 'p1', status: 'scheduled', metadata: { location: '7:00' } },
      { employee_id: 'p2', status: 'scheduled', metadata: { location: 'เข้ากะ 6:30' } },
      { employee_id: 'p3', status: 'scheduled', metadata: { location: '8:00' } },
      { employee_id: 'p4', status: 'scheduled', metadata: { location: 'ไปสาขา 2' } },
      { employee_id: 'p5', status: 'on_leave', metadata: { location: 'ลา' } },
    ];

    const result = formatDailyShifts(profiles, shifts);

    expect(result.front_store.map((entry) => `${entry.name} - ${entry.shift}`)).toEqual([
      'ปิ่น - 6:30',
      'มุก - 7:00',
      'เม - 8:00',
    ]);
    expect(result.other_duty.map((entry) => `${entry.name} - ${entry.shift}`)).toEqual([
      'ฟิว - ไปสาขา 2',
    ]);
    expect(result.off_or_leave.map((entry) => `${entry.name} - ${entry.shift}`)).toEqual([
      'ล่า - ลา',
      'นิต้า - วันหยุด',
      'มีนา - วันหยุด',
      'หนูดี - วันหยุด',
      'ชัช - วันหยุด',
    ]);
  });

  test('never invents sequential times from row order', () => {
    const shifts = profiles.slice(0, 5).map((profile, index) => ({
      employee_id: profile.id,
      status: 'scheduled',
      metadata: { location: ['6:30', '7:00', '8:00', 'ร้านซักผ้า', 'ลา'][index] },
    }));

    const result = formatDailyShifts(profiles, shifts);
    const frontStoreShifts = result.front_store.map((entry) => entry.shift);

    expect(frontStoreShifts).toEqual(['6:30', '7:00', '8:00']);
    expect(frontStoreShifts).not.toContain('9:00');
    expect(frontStoreShifts).not.toContain('10:00');
    expect(frontStoreShifts).not.toContain('11:00');
  });

  test('normalizeShiftLocation strips เข้ากะ prefix and maps day off', () => {
    expect(normalizeShiftLocation('เข้ากะ 7:00')).toBe('7:00');
    expect(normalizeShiftLocation('')).toBe('วันหยุด');
    expect(normalizeShiftLocation(null)).toBe('วันหยุด');
    expect(normalizeShiftLocation('ลา', 'on_leave')).toBe('ลา');
  });
});
