import { describe, expect, test } from 'vitest';
import {
  buildHomeLeaveRows,
  buildHomeDutySummary,
  formatHomeDutySummaryLine,
} from '@/lib/schedule/home-day-roster';

const dateIso = '2026-09-18'; // Friday → dayIndex 4, weekly limit 3

const profiles = [
  { id: '1', full_name: 'นิต้า', schedule_order: 1 },
  { id: '2', full_name: 'ปิ่น', schedule_order: 2 },
  { id: '3', full_name: 'มุก', schedule_order: 3 },
  { id: '4', full_name: 'เม', schedule_order: 4 },
  { id: '5', full_name: 'มีนา', schedule_order: 5 },
];

function shift(
  employee_id: string,
  location: string,
  status = 'scheduled',
  extra?: { remark?: string },
) {
  return {
    id: employee_id,
    employee_id,
    start_time: `${dateIso}T00:00:00`,
    end_time: `${dateIso}T23:59:59`,
    status,
    metadata: { location, ...extra },
  };
}

describe('buildHomeLeaveRows', () => {
  test('lists leave and day off for assigned shifts only', () => {
    const rows = buildHomeLeaveRows(
      profiles,
      [
        shift('1', '6:30'),
        shift('2', 'ลา', 'on_leave', { remark: 'ธุระส่วนตัว' }),
        shift('3', 'วันหยุด'),
        shift('4', 'ไปสาขา 2'),
      ],
      dateIso,
    );
    expect(rows.map((r) => `${r.fullName}:${r.kind}:${r.label}`)).toEqual([
      'ปิ่น:leave:ลา',
      'มุก:day_off:วันหยุด',
    ]);
    expect(rows[0].remark).toBe('ธุระส่วนตัว');
  });

  test('omits profiles with no assigned shift', () => {
    const rows = buildHomeLeaveRows(profiles, [shift('1', '6:30')], dateIso);
    expect(rows).toEqual([]);
  });
});

describe('buildHomeDutySummary', () => {
  test('counts categories and flags understaffed Friday when front store <= 3', () => {
    const summary = buildHomeDutySummary(
      profiles,
      [
        shift('1', '6:30'),
        shift('2', '7:00'),
        shift('3', 'ลา', 'on_leave'),
        shift('4', 'ไปสาขา 2'),
        shift('5', 'วันหยุด'),
      ],
      dateIso,
    );
    expect(summary).toMatchObject({
      frontStoreCount: 2,
      otherDutyCount: 1,
      leaveCount: 1,
      dayOffCount: 1,
      isUnderstaffedToday: true,
    });
    expect(formatHomeDutySummaryLine(summary)).toBe(
      'กะหน้าร้าน 2 · ลา 1 · หน้าที่อื่น 1',
    );
  });

  test('is not understaffed when front store exceeds weekday limit', () => {
    const summary = buildHomeDutySummary(
      profiles,
      [
        shift('1', '6:30'),
        shift('2', '7:00'),
        shift('3', '8:00'),
        shift('4', '6:30'),
      ],
      dateIso,
    );
    expect(summary.frontStoreCount).toBe(4);
    expect(summary.isUnderstaffedToday).toBe(false);
  });
});
