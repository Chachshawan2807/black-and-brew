import { describe, expect, test } from 'vitest';
import {
  getMgmtHistoryPaginationCursor,
  groupManagementHistoryShifts,
  isManagementHistoryShift,
  mergeManagementHistoryShiftPages,
  shouldContinueMgmtHistoryPagination,
} from '@/lib/schedule/mgmt-history';

const shiftTypes = [
  { value: 'ลา', label: 'ลา', className: 'bg-pink-100', style: undefined },
] as const;

describe('isManagementHistoryShift', () => {
  test('includes explicit management rows', () => {
    expect(
      isManagementHistoryShift({
        status: 'scheduled',
        metadata: { is_management: true, location: '6:30' },
      }),
    ).toBe(true);
  });

  test('includes legacy leave rows that stored only remark metadata', () => {
    expect(
      isManagementHistoryShift({
        status: 'on_leave',
        metadata: { remark: 'สอบ Forward', location: 'ลา' },
      }),
    ).toBe(true);
  });

  test('includes legacy leave rows marked only with leave location', () => {
    expect(
      isManagementHistoryShift({
        status: 'on_leave',
        metadata: { location: 'ลา' },
      }),
    ).toBe(true);
  });

  test('excludes plain on_leave rows without management markers', () => {
    expect(
      isManagementHistoryShift({
        status: 'on_leave',
        metadata: { location: '6:30' },
      }),
    ).toBe(false);
  });
});

describe('groupManagementHistoryShifts', () => {
  test('merges consecutive management days into one history row', () => {
    const grouped = groupManagementHistoryShifts(
      [
        {
          id: '1',
          employee_id: 'a',
          status: 'on_leave',
          start_time: '2026-05-27T00:00:00',
          end_time: '2026-05-27T00:00:00',
          metadata: { is_management: true, location: 'ลา', remark: '' },
          profiles: { full_name: 'นิต้า' },
        },
        {
          id: '2',
          employee_id: 'a',
          status: 'on_leave',
          start_time: '2026-05-28T00:00:00',
          end_time: '2026-05-28T00:00:00',
          metadata: { is_management: true, location: 'ลา', remark: '' },
          profiles: { full_name: 'นิต้า' },
        },
      ],
      [...shiftTypes],
    );

    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.startDate).toBe('2026-05-27T00:00:00');
    expect(grouped[0]?.endDate).toBe('2026-05-28T00:00:00');
  });
});

describe('mergeManagementHistoryShiftPages', () => {
  test('deduplicates appended pages by shift id', () => {
    const existing = [{ id: '1', employee_id: 'a', start_time: '2026-01-02', end_time: '', status: 'on_leave', metadata: {} }];
    const incoming = [
      { id: '1', employee_id: 'a', start_time: '2026-01-02', end_time: '', status: 'on_leave', metadata: {} },
      { id: '2', employee_id: 'b', start_time: '2026-01-01', end_time: '', status: 'on_leave', metadata: {} },
    ];

    expect(mergeManagementHistoryShiftPages(existing, incoming)).toHaveLength(2);
  });
});

describe('shouldContinueMgmtHistoryPagination', () => {
  test('keeps paging when a full batch had no management rows after client filter', () => {
    expect(shouldContinueMgmtHistoryPagination(80, 0, 1)).toBe(true);
  });

  test('stops when a partial batch is returned', () => {
    expect(shouldContinueMgmtHistoryPagination(12, 0, 1)).toBe(false);
  });
});

describe('getMgmtHistoryPaginationCursor', () => {
  test('uses the oldest start_time in a descending batch', () => {
    expect(
      getMgmtHistoryPaginationCursor([
        { id: '2', employee_id: 'a', start_time: '2026-02-01', end_time: '', status: 'on_leave', metadata: {} },
        { id: '1', employee_id: 'a', start_time: '2026-01-01', end_time: '', status: 'on_leave', metadata: {} },
      ]),
    ).toBe('2026-01-01');
  });
});
