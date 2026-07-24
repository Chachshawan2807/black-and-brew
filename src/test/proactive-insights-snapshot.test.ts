import { describe, expect, test, vi } from 'vitest';
import { compileOperationalSnapshot } from '@/lib/proactive-insights/compile-operational-snapshot';
import type { OperationalSnapshotDeps } from '@/lib/proactive-insights/compile-operational-snapshot';

const defaultWeeklyDays = [
  { dateIso: '2026-07-20', dayIndex: 0, headcount: 4, leaveCount: 0 },
  { dateIso: '2026-07-21', dayIndex: 1, headcount: 4, leaveCount: 1 },
  { dateIso: '2026-07-22', dayIndex: 2, headcount: 5, leaveCount: 0 },
  { dateIso: '2026-07-23', dayIndex: 3, headcount: 5, leaveCount: 0 },
  { dateIso: '2026-07-24', dayIndex: 4, headcount: 1, leaveCount: 0 },
  { dateIso: '2026-07-25', dayIndex: 5, headcount: 5, leaveCount: 0 },
  { dateIso: '2026-07-26', dayIndex: 6, headcount: 5, leaveCount: 0 },
];

function makeDeps(overrides: Partial<OperationalSnapshotDeps> = {}): OperationalSnapshotDeps {
  return {
    fetchShifts: vi.fn(async () => ({
      activeStaff: [{ name: 'นิต้า', shiftText: '6:30' }],
      otherDutyStaff: [],
      offStaff: [
        { name: 'เอ', shiftText: 'ลา' },
        { name: 'บี', shiftText: 'วันหยุด' },
      ],
      headcount: 1,
    })),
    fetchWeekSchedule: vi.fn(async () => defaultWeeklyDays),
    fetchPendingBeanOrders: vi.fn(async () => 3),
    fetchYesterdaySales: vi.fn(async () => 15000),
    fetchNextHoliday: vi.fn(async () => ({ name: 'สงกรานต์', daysRemaining: 10 })),
    ...overrides,
  };
}

describe('compileOperationalSnapshot', () => {
  test('aggregates parallel deps into snapshot fields', async () => {
    const deps = makeDeps();
    const snapshot = await compileOperationalSnapshot(
      { dateIso: '2026-07-24', locale: 'th' },
      deps,
    );

    expect(snapshot.dateIso).toBe('2026-07-24');
    expect(snapshot.dateDisplay).toBe('24-07-2026');
    expect(snapshot.headcount).toBe(1);
    expect(snapshot.leaveCount).toBe(1);
    expect(snapshot.offCount).toBe(2);
    expect(snapshot.weeklyDays).toEqual(defaultWeeklyDays);
    expect(snapshot.pendingBeanOrders).toBe(3);
    expect(snapshot.yesterdaySalesTotal).toBe(15000);
    expect(snapshot.upcomingHoliday).toEqual({ name: 'สงกรานต์', daysRemaining: 10 });
  });

  test('counts leave only when shiftText is ลา', async () => {
    const deps = makeDeps({
      fetchShifts: vi.fn(async () => ({
        activeStaff: [],
        otherDutyStaff: [],
        offStaff: [
          { name: 'เอ', shiftText: 'ลา' },
          { name: 'บี', shiftText: 'ลา' },
          { name: 'ซี', shiftText: 'วันหยุด' },
        ],
        headcount: 0,
      })),
    });
    const snapshot = await compileOperationalSnapshot(
      { dateIso: '2026-07-24', locale: 'th' },
      deps,
    );
    expect(snapshot.leaveCount).toBe(2);
    expect(snapshot.offCount).toBe(3);
  });

  test('tolerates failed deps with safe defaults', async () => {
    const deps = makeDeps({
      fetchWeekSchedule: vi.fn(async () => {
        throw new Error('schedule down');
      }),
      fetchNextHoliday: vi.fn(async () => null),
    });
    const snapshot = await compileOperationalSnapshot(
      { dateIso: '2026-07-24', locale: 'th' },
      deps,
    );
    expect(snapshot.weeklyDays).toHaveLength(7);
    expect(snapshot.upcomingHoliday).toBeNull();
    expect(snapshot.headcount).toBe(1);
  });
});
