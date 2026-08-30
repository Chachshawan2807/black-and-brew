import { describe, expect, it } from 'vitest';
import {
  getDashboardShiftQueryPlan,
  splitDashboardShiftsByRange,
} from '@/app/[locale]/dashboard/dashboard-data';

describe('dashboard data loading plan', () => {
  it('uses one union shift query when the selected week is inside the roster range', () => {
    expect(
      getDashboardShiftQueryPlan({
        startDate: '2026-06-15',
        endDate: '2026-06-21',
        rosterStart: '2026-06-01',
        rosterEnd: '2026-06-30',
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
        rosterStart: '2026-06-01',
        rosterEnd: '2026-06-30',
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
        rosterStart: '2026-06-01',
        rosterEnd: '2026-06-30',
      }),
    ).toEqual({
      mode: 'separate',
      weeklyStart: '2026-04-06',
      weeklyEnd: '2026-04-12',
      rosterStart: '2026-06-01',
      rosterEnd: '2026-06-30',
    });
  });

  it('includes cross-month roster cookie range instead of truncating to the current calendar month', () => {
    expect(
      getDashboardShiftQueryPlan({
        startDate: '2026-08-25',
        endDate: '2026-08-31',
        rosterStart: '2026-07-26',
        rosterEnd: '2026-08-25',
      }),
    ).toEqual({
      mode: 'combined',
      startDate: '2026-07-26',
      endDate: '2026-08-31',
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
      rosterStart: '2026-06-01',
      rosterEnd: '2026-06-30',
    });

    expect(result.weeklyShifts.map((shift) => shift.id)).toEqual(['weekly-only', 'both']);
    expect(result.rosterShifts.map((shift) => shift.id)).toEqual(['both', 'monthly-only']);
  });

  it('keeps roster shifts from the start of a cross-month cookie range', () => {
    const shifts = [
      { id: 'jul-26', start_time: '2026-07-26T06:30:00' },
      { id: 'jul-31', start_time: '2026-07-31T06:30:00' },
      { id: 'aug-01', start_time: '2026-08-01T06:30:00' },
      { id: 'aug-25', start_time: '2026-08-25T06:30:00' },
      { id: 'aug-31', start_time: '2026-08-31T06:30:00' },
    ];

    const result = splitDashboardShiftsByRange(shifts, {
      startDate: '2026-08-25',
      endDate: '2026-08-31',
      rosterStart: '2026-07-26',
      rosterEnd: '2026-08-25',
    });

    expect(result.rosterShifts.map((shift) => shift.id)).toEqual([
      'jul-26',
      'jul-31',
      'aug-01',
      'aug-25',
    ]);
    expect(result.weeklyShifts.map((shift) => shift.id)).toEqual(['aug-25', 'aug-31']);
  });
});
