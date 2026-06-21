import { describe, expect, it } from 'vitest';
import {
  getDashboardShiftQueryPlan,
  splitDashboardShiftsByRange,
} from '@/app/[locale]/dashboard/dashboard-data';

describe('dashboard data loading plan', () => {
  it('uses one union shift query when the selected week is inside the monthly roster range', () => {
    expect(
      getDashboardShiftQueryPlan({
        startDate: '2026-06-15',
        endDate: '2026-06-21',
        monthStart: '2026-06-01',
        monthEnd: '2026-06-30',
      }),
    ).toEqual({
      mode: 'combined',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    });
  });

  it('uses one union shift query when dashboard and roster ranges partially overlap', () => {
    expect(
      getDashboardShiftQueryPlan({
        startDate: '2026-05-29',
        endDate: '2026-06-04',
        monthStart: '2026-06-01',
        monthEnd: '2026-06-30',
      }),
    ).toEqual({
      mode: 'combined',
      startDate: '2026-05-29',
      endDate: '2026-06-30',
    });
  });

  it('keeps separate shift queries when ranges do not overlap', () => {
    expect(
      getDashboardShiftQueryPlan({
        startDate: '2026-04-06',
        endDate: '2026-04-12',
        monthStart: '2026-06-01',
        monthEnd: '2026-06-30',
      }),
    ).toEqual({
      mode: 'separate',
      weeklyStart: '2026-04-06',
      weeklyEnd: '2026-04-12',
      monthlyStart: '2026-06-01',
      monthlyEnd: '2026-06-30',
    });
  });

  it('splits a union shift payload back into the exact dashboard and roster ranges', () => {
    const shifts = [
      { id: 'before', start_time: '2026-05-28T00:00:00' },
      { id: 'weekly-only', start_time: '2026-05-30T00:00:00' },
      { id: 'both', start_time: '2026-06-02T00:00:00' },
      { id: 'monthly-only', start_time: '2026-06-20T00:00:00' },
      { id: 'after', start_time: '2026-07-01T00:00:00' },
    ];

    const result = splitDashboardShiftsByRange(shifts, {
      startDate: '2026-05-29',
      endDate: '2026-06-04',
      monthStart: '2026-06-01',
      monthEnd: '2026-06-30',
    });

    expect(result.weeklyShifts.map((shift) => shift.id)).toEqual(['weekly-only', 'both']);
    expect(result.monthlyShifts.map((shift) => shift.id)).toEqual(['both', 'monthly-only']);
  });
});
