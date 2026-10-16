import { describe, expect, test } from 'vitest';
import { buildMissingWeekShiftCopies } from '@/lib/schedule/copy-week-shifts';

describe('buildMissingWeekShiftCopies', () => {
  test('copies only assigned non-cancelled shifts into empty employee dates', () => {
    const result = buildMissingWeekShiftCopies({
      sourceShifts: [
        { employee_id: 'p1', start_time: '2026-10-19T00:00:00', end_time: '2026-10-19T23:59:59', status: 'scheduled', metadata: { location: '6:30' } },
        { employee_id: 'p2', start_time: '2026-10-20T00:00:00', end_time: '2026-10-20T23:59:59', status: 'cancelled', metadata: { location: '7:00' } },
        { employee_id: 'p3', start_time: '2026-10-21T00:00:00', end_time: '2026-10-21T23:59:59', status: 'on_leave', metadata: { location: 'ลา' } },
        { employee_id: 'p4', start_time: '2026-10-22T00:00:00', end_time: '2026-10-22T23:59:59', status: 'scheduled', metadata: { location: 'ไปสาขา 2' } },
      ],
      targetShifts: [
        { employee_id: 'p1', start_time: '2026-10-26T00:00:00', end_time: '2026-10-26T23:59:59', status: 'on_leave', metadata: { location: 'ลา' } },
        { employee_id: 'p5', start_time: '2026-10-29T00:00:00', end_time: '2026-10-29T23:59:59', status: 'scheduled', metadata: { location: '8:00' } },
      ],
      sourceStartDate: '2026-10-19',
      targetStartDate: '2026-10-26',
    });

    expect(result.copies.map((shift) => [shift.employee_id, shift.start_time, shift.metadata.location])).toEqual([
      ['p4', '2026-10-29T00:00:00', 'ไปสาขา 2'],
    ]);
    expect(result.skippedExisting).toBe(0);
    expect(result.skippedCancelled).toBe(1);
    expect(result.skippedRequests).toBe(2);
  });
});
