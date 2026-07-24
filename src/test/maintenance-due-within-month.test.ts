import { describe, expect, test } from 'vitest';
import { computeUpcomingMaintenanceTasks } from '@/lib/maintenance/compute-upcoming-maintenance';
import {
  computeMaintenanceDueWithinMonth,
  filterMaintenanceDueWithinMonth,
} from '@/lib/maintenance/filter-due-within-month';
import type { MaintenanceServiceRecord } from '@/lib/maintenance/types';

const sampleRecords: MaintenanceServiceRecord[] = [
  {
    id: '1',
    equipment: 'เครื่องกรองน้ำ',
    work_details: 'เปลี่ยนไส้กรองหยาบ',
    start_date: '2026-04-04',
    completion_date: '2026-04-04',
    recommended_frequency: 'ทุก 3 เดือน',
    status: 'เสร็จสมบูรณ์',
  },
  {
    id: '2',
    equipment: 'แอร์ 3 เครื่อง',
    work_details: 'ล้างทำความสะอาดด้วยช่างทั้ง 3 เครื่อง',
    start_date: '2026-05-06',
    completion_date: '2026-05-06',
    recommended_frequency: 'ทุก 6 เดือน',
    status: 'เสร็จสมบูรณ์',
  },
];

describe('filter-due-within-month', () => {
  test('includes overdue, within 7 days, and within 30 days tasks only', () => {
    const allTasks = computeUpcomingMaintenanceTasks(sampleRecords, '2026-07-08');
    const filtered = filterMaintenanceDueWithinMonth(allTasks);

    expect(filtered.every((task) => task.urgency !== 'within_90_days')).toBe(true);
    expect(filtered.every((task) => task.urgency !== 'later')).toBe(true);
    expect(filtered.some((task) => task.urgency === 'overdue')).toBe(true);
  });

  test('computeMaintenanceDueWithinMonth returns sorted due-within-month tasks', () => {
    const tasks = computeMaintenanceDueWithinMonth(sampleRecords, '2026-07-08');
    const dueDates = tasks.map((task) => task.dueDate);
    expect([...dueDates].sort()).toEqual(dueDates);
  });
});
