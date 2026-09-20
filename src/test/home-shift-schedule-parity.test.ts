import { describe, expect, test } from 'vitest';
import { buildHomeShiftStatusRows } from '@/lib/schedule/home-shift-status';
import {
  isScheduleGridShiftAssigned,
  resolveScheduleGridShift,
  createClientShiftDateLookup,
} from '@/lib/schedule/schedule-grid-parity';

describe('home shift schedule parity', () => {
  test('isScheduleGridShiftAssigned matches schedule cell visibility', () => {
    expect(
      isScheduleGridShiftAssigned({
        id: '1',
        employee_id: 'a',
        start_time: '2026-09-18T00:00:00',
        end_time: '2026-09-18T23:59:59',
        status: 'scheduled',
        metadata: { location: '6:30' },
      }),
    ).toBe(true);
    expect(
      isScheduleGridShiftAssigned({
        id: '2',
        employee_id: 'a',
        start_time: '2026-09-18T00:00:00',
        end_time: '2026-09-18T23:59:59',
        status: '',
        metadata: { location: '6:30' },
      }),
    ).toBe(false);
    expect(
      isScheduleGridShiftAssigned({
        id: '3',
        employee_id: 'a',
        start_time: '2026-09-18T00:00:00',
        end_time: '2026-09-18T23:59:59',
        status: 'scheduled',
        metadata: {},
      }),
    ).toBe(false);
  });

  test('resolveScheduleGridShift uses the same profile+date key as the schedule grid', () => {
    const shifts = [
      {
        id: '1',
        employee_id: 'a',
        start_time: '2026-09-18T00:00:00',
        end_time: '2026-09-18T23:59:59',
        status: 'scheduled',
        metadata: { location: '6:30' },
      },
      {
        id: '2',
        employee_id: 'a',
        start_time: '2026-09-19T00:00:00',
        end_time: '2026-09-19T23:59:59',
        status: 'scheduled',
        metadata: { location: '7:00' },
      },
    ];
    const lookup = createClientShiftDateLookup(shifts);
    expect(resolveScheduleGridShift(lookup, 'a', '2026-09-18')?.metadata?.location).toBe('6:30');
    expect(resolveScheduleGridShift(lookup, 'a', '2026-09-19')?.metadata?.location).toBe('7:00');
  });

  test('buildHomeShiftStatusRows lists timed front-store shifts only for the board date', () => {
    const shifts = [
      {
        id: '1',
        employee_id: 'a',
        start_time: '2026-09-18T00:00:00',
        end_time: '2026-09-18T23:59:59',
        status: 'scheduled',
        metadata: { location: '6:30' },
      },
      {
        id: '2',
        employee_id: 'b',
        start_time: '2026-09-18T00:00:00',
        end_time: '2026-09-18T23:59:59',
        status: 'scheduled',
        metadata: { location: 'ไปสาขา 2' },
      },
    ];
    const rows = buildHomeShiftStatusRows(
      [
        { id: 'a', full_name: 'Ann', schedule_order: 1 },
        { id: 'b', full_name: 'Bob', schedule_order: 2 },
      ],
      shifts,
      '2026-09-18',
    );
    expect(rows.map((row) => row.profileId)).toEqual(['a']);
    expect(rows[0]?.timedWindowLabel).toBe('6:30 - 15:30');
  });
});
