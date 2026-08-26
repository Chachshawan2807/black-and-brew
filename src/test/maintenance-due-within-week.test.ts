import { describe, expect, test } from 'vitest';
import { computeUpcomingMaintenanceTasks } from '@/lib/maintenance/compute-upcoming-maintenance';
import {
  computeMaintenanceDueWithinWeek,
  filterMaintenanceDueWithinWeek,
} from '@/lib/maintenance/filter-due-within-week';
import {
  REAL_MONTH_FILTER_SAMPLE_RECORDS,
  REAL_SERVICE_RECORD_REFERENCE_DATE,
  REAL_WEEK_FILTER_LATER_RECORD,
  REAL_WEEK_FILTER_SOON_RECORD,
} from '@/test/fixtures/service-records.fixture';

describe('filter-due-within-week', () => {
  test('includes overdue and within 7 days tasks only', () => {
    const allTasks = computeUpcomingMaintenanceTasks(
      REAL_MONTH_FILTER_SAMPLE_RECORDS,
      REAL_SERVICE_RECORD_REFERENCE_DATE,
    );
    const filtered = filterMaintenanceDueWithinWeek(allTasks);

    expect(filtered.every((task) => task.urgency !== 'within_30_days')).toBe(true);
    expect(filtered.every((task) => task.urgency !== 'within_90_days')).toBe(true);
    expect(filtered.every((task) => task.urgency !== 'later')).toBe(true);
    expect(filtered.some((task) => task.urgency === 'overdue')).toBe(true);
  });

  test('computeMaintenanceDueWithinWeek returns sorted due-within-week tasks', () => {
    const tasks = computeMaintenanceDueWithinWeek(
      REAL_MONTH_FILTER_SAMPLE_RECORDS,
      REAL_SERVICE_RECORD_REFERENCE_DATE,
    );
    const dueDates = tasks.map((task) => task.dueDate);
    expect([...dueDates].sort()).toEqual(dueDates);
  });

  test('excludes tasks due more than 7 days away', () => {
    const records = [REAL_WEEK_FILTER_SOON_RECORD, REAL_WEEK_FILTER_LATER_RECORD];

    const tasks = computeMaintenanceDueWithinWeek(records, '2026-08-10');

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: '6495ddf3-d2b3-487c-a16c-dcfed51fb08a',
      equipment: 'เครื่องบดกาแฟคั่วเข้ม',
      urgency: 'within_7_days',
    });
  });
});
