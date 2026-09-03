import { describe, expect, test } from 'vitest';
import {
  computeUpcomingMaintenanceTasks,
  formatDueDateWithDaysRemaining,
} from '@/lib/maintenance/compute-upcoming-maintenance';
import {
  computeMaintenanceDueWithinMonth,
  filterMaintenanceDueWithinMonth,
} from '@/lib/maintenance/filter-due-within-month';
import type { MaintenanceServiceRecord } from '@/lib/maintenance/types';
import {
  REAL_MONTH_FILTER_SAMPLE_RECORDS,
  REAL_PP_FILTER_DEDUP_RECORDS,
  REAL_SERVICE_RECORD_REFERENCE_DATE,
} from '@/test/fixtures/service-records.fixture';

describe('filter-due-within-month', () => {
  test('includes overdue, within 7 days, and within 30 days tasks only', () => {
    const allTasks = computeUpcomingMaintenanceTasks(
      REAL_MONTH_FILTER_SAMPLE_RECORDS,
      REAL_SERVICE_RECORD_REFERENCE_DATE,
    );
    const filtered = filterMaintenanceDueWithinMonth(allTasks);

    expect(filtered.every((task) => task.urgency !== 'within_90_days')).toBe(true);
    expect(filtered.every((task) => task.urgency !== 'later')).toBe(true);
    expect(filtered.some((task) => task.urgency === 'overdue')).toBe(true);
  });

  test('computeMaintenanceDueWithinMonth returns sorted due-within-month tasks', () => {
    const tasks = computeMaintenanceDueWithinMonth(
      REAL_MONTH_FILTER_SAMPLE_RECORDS,
      REAL_SERVICE_RECORD_REFERENCE_DATE,
    );
    const dueDates = tasks.map((task) => task.dueDate);
    expect([...dueDates].sort()).toEqual(dueDates);
  });

  test('keeps only the latest service per equipment when recomputing due dates', () => {
    const tasks = computeMaintenanceDueWithinMonth(REAL_PP_FILTER_DEDUP_RECORDS, '2026-08-20');

    expect(tasks).toHaveLength(0);
    expect(computeUpcomingMaintenanceTasks(REAL_PP_FILTER_DEDUP_RECORDS, '2026-08-20')).toEqual([
      expect.objectContaining({
        id: 'db718e9c-38d5-4fe5-8848-0e05a11b26b1',
        equipment: 'ไส้กรอง PP เครื่องชง',
        dueDate: '2026-09-25',
      }),
    ]);
  });

  test('treats equipment names with spacing differences as the same asset', () => {
    const records: MaintenanceServiceRecord[] = [
      {
        id: 'a',
        equipment: 'ท่อระบายน้ำ เครื่องชงกาแฟ',
        work_details: 'ล้างทำความสะอาดด้วยโซดาไฟ',
        start_date: '2026-06-01',
        completion_date: '2026-06-01',
        recommended_frequency: 'ทุก 1 เดือน',
      },
      {
        id: 'f680e7f0-4d97-49db-9b3b-e673bc66ea4f',
        equipment: 'ท่อระบายน้ำเครื่องชงกาแฟ',
        work_details: null,
        start_date: '2026-08-14',
        completion_date: '2026-08-25',
        recommended_frequency: 'ทุก 1 เดือน',
      },
    ];

    const tasks = computeUpcomingMaintenanceTasks(records, '2026-08-20');

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: 'f680e7f0-4d97-49db-9b3b-e673bc66ea4f',
      equipment: 'ท่อระบายน้ำเครื่องชงกาแฟ',
      dueDate: '2026-09-25',
    });
  });
});

describe('formatDueDateWithDaysRemaining', () => {
  test('formats upcoming due date with remaining days', () => {
    expect(
      formatDueDateWithDaysRemaining('2026-10-26', REAL_SERVICE_RECORD_REFERENCE_DATE),
    ).toBe('26/10/2026 (55 วัน)');
  });

  test('formats due today and overdue days', () => {
    expect(
      formatDueDateWithDaysRemaining('2026-09-01', REAL_SERVICE_RECORD_REFERENCE_DATE),
    ).toBe('01/09/2026 (วันนี้)');
    expect(
      formatDueDateWithDaysRemaining('2026-08-26', REAL_SERVICE_RECORD_REFERENCE_DATE),
    ).toBe('26/08/2026 (เลย 6 วัน)');
  });
});
