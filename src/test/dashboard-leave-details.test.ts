import { describe, expect, it } from 'vitest';
import {
  collectLeaveEntries,
  collectPublicHolidayWorkEntries,
  computeDashboardStaffStatCounts,
  createHolidayDateLookup,
  formatLeaveDetailEntry,
  getPublicHolidayEntry,
  getLeaveRemark,
  isLeaveShift,
} from '@/lib/dashboard/leave-details';

describe('dashboard leave details', () => {
  it('identifies leave shifts from status and location', () => {
    expect(isLeaveShift({ status: 'on_leave', metadata: {} })).toBe(true);
    expect(isLeaveShift({ status: 'scheduled', metadata: { location: 'ลา' } })).toBe(true);
    expect(isLeaveShift({ status: 'scheduled', metadata: { location: '8:00' } })).toBe(false);
  });

  it('reads remark from management and legacy note fields', () => {
    expect(getLeaveRemark({ metadata: { remark: 'ลาป่วย' } })).toBe('ลาป่วย');
    expect(getLeaveRemark({ metadata: { notes: 'ธุระด่วน' } })).toBe('ธุระด่วน');
    expect(getLeaveRemark({ metadata: {} })).toBe('');
  });

  it('collects leave entries from schedule and management sources', () => {
    const shifts = [
      {
        employee_id: 'a',
        start_time: '2026-06-03T00:00:00',
        status: 'on_leave',
        metadata: { location: 'ลา' },
      },
      {
        employee_id: 'a',
        start_time: '2026-06-05T00:00:00',
        status: 'on_leave',
        metadata: { location: 'ลา', is_management: true, remark: 'ไปธุระ' },
      },
      {
        employee_id: 'b',
        start_time: '2026-06-05T00:00:00',
        status: 'on_leave',
        metadata: { location: 'ลา', remark: 'other' },
      },
    ];

    const entries = collectLeaveEntries(shifts, 'a', {
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      date: '2026-06-03',
      remark: '',
    });
    expect(entries[1]).toMatchObject({
      date: '2026-06-05',
      remark: 'ไปธุระ',
    });
  });

  it('merges duplicate leave rows on the same date preferring management remark', () => {
    const shifts = [
      {
        employee_id: 'a',
        start_time: '2026-06-05T00:00:00',
        status: 'on_leave',
        metadata: { location: 'ลา' },
      },
      {
        employee_id: 'a',
        start_time: '2026-06-05T00:00:00',
        status: 'on_leave',
        metadata: { location: 'ลา', is_management: true, remark: 'ลาป่วย' },
      },
    ];

    const entries = collectLeaveEntries(shifts, 'a');
    expect(entries).toHaveLength(1);
    expect(entries[0].remark).toBe('ลาป่วย');
  });

  it('filters to a single date when requested', () => {
    const shifts = [
      {
        employee_id: 'a',
        start_time: '2026-06-03T00:00:00',
        status: 'on_leave',
        metadata: { location: 'ลา', remark: 'A' },
      },
      {
        employee_id: 'a',
        start_time: '2026-06-04T00:00:00',
        status: 'on_leave',
        metadata: { location: 'ลา', remark: 'B' },
      },
    ];

    const entries = collectLeaveEntries(shifts, 'a', { singleDate: '2026-06-04' });
    expect(entries).toEqual([
      expect.objectContaining({
        date: '2026-06-04',
        remark: 'B',
      }),
    ]);
  });

  it('formats abbreviated Thai day and date labels on one row', () => {
    const entry = formatLeaveDetailEntry('2026-06-03', 'ลาป่วย');
    expect(entry.dayLabel).toBe('พ.');
    expect(entry.dateLabel).toBe('3 มิ.ย. 2026');
    expect(entry.remark).toBe('ลาป่วย');
  });

  it('collects scheduled work days that fall on public holidays', () => {
    const shifts = [
      {
        employee_id: 'a',
        start_time: '2026-08-07T00:00:00',
        status: 'scheduled',
        metadata: { location: '8:00' },
      },
      {
        employee_id: 'a',
        start_time: '2026-08-08T00:00:00',
        status: 'scheduled',
        metadata: { location: '8:00' },
      },
      {
        employee_id: 'a',
        start_time: '2026-08-09T00:00:00',
        status: 'on_leave',
        metadata: { location: 'ลา' },
      },
      {
        employee_id: 'b',
        start_time: '2026-08-07T00:00:00',
        status: 'scheduled',
        metadata: { location: '8:00' },
      },
    ];
    const holidays = [
      { date: '2026-08-07', name: 'วันแม่แห่งชาติ' },
      { date: '2026-08-09', name: 'วันหยุดทดสอบ' },
    ];

    const entries = collectPublicHolidayWorkEntries(shifts, 'a', holidays, {
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      date: '2026-08-07',
      remark: 'วันแม่แห่งชาติ',
    });
  });

  it('builds a public holiday entry for a selected roster date', () => {
    const holidays = [
      { date: '2026-08-07', name: 'วันแม่แห่งชาติ' },
      { date: '2026-08-12', name: 'วันแม่แห่งชาติ' },
    ];

    expect(getPublicHolidayEntry('2026-08-07', holidays)).toMatchObject({
      date: '2026-08-07',
      dateLabel: '7 ส.ค. 2026',
      dayLabel: 'ศ.',
      remark: 'วันแม่แห่งชาติ',
    });
    expect(getPublicHolidayEntry('2026-08-01', holidays)).toBeNull();
    expect(createHolidayDateLookup(holidays).get('2026-08-12')).toBe('วันแม่แห่งชาติ');
  });

  it('computes dashboard staff stat counts for work leave and public holidays', () => {
    const shifts = [
      {
        employee_id: 'a',
        start_time: '2026-08-07T00:00:00',
        status: 'scheduled',
        metadata: { location: '8:00' },
      },
      {
        employee_id: 'a',
        start_time: '2026-08-08T00:00:00',
        status: 'scheduled',
        metadata: { location: '8:00' },
      },
      {
        employee_id: 'a',
        start_time: '2026-08-09T00:00:00',
        status: 'on_leave',
        metadata: { location: 'ลา' },
      },
    ];
    const holidays = [{ date: '2026-08-07', name: 'วันแม่แห่งชาติ' }];

    expect(
      computeDashboardStaffStatCounts(shifts, 'a', holidays, {
        startDate: '2026-08-01',
        endDate: '2026-08-31',
      }),
    ).toEqual({
      workDays: 2,
      leaveDays: 1,
      publicHolidays: 1,
    });
  });
});
