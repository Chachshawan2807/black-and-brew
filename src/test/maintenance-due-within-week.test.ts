import { describe, expect, test } from 'vitest';
import { computeUpcomingMaintenanceTasks } from '@/lib/maintenance/compute-upcoming-maintenance';
import {
  computeMaintenanceDueWithinWeek,
  filterMaintenanceDueWithinWeek,
} from '@/lib/maintenance/filter-due-within-week';
import type { MaintenanceServiceRecord } from '@/lib/maintenance/types';

const sampleRecords: MaintenanceServiceRecord[] = [
  {
    id: '1',
    equipment: 'เครื่องกรองน้ำ',
    work_details: 'เปลี่ยนไส้กรองหยาบ',
    start_date: '2026-04-04',
    completion_date: '2026-04-04',
    recommended_frequency: 'ทุก 3 เดือน',
  },
  {
    id: '2',
    equipment: 'แอร์ 3 เครื่อง',
    work_details: 'ล้างทำความสะอาดด้วยช่างทั้ง 3 เครื่อง',
    start_date: '2026-05-06',
    completion_date: '2026-05-06',
    recommended_frequency: 'ทุก 6 เดือน',
  },
];

describe('filter-due-within-week', () => {
  test('includes overdue and within 7 days tasks only', () => {
    const allTasks = computeUpcomingMaintenanceTasks(sampleRecords, '2026-07-08');
    const filtered = filterMaintenanceDueWithinWeek(allTasks);

    expect(filtered.every((task) => task.urgency !== 'within_30_days')).toBe(true);
    expect(filtered.every((task) => task.urgency !== 'within_90_days')).toBe(true);
    expect(filtered.every((task) => task.urgency !== 'later')).toBe(true);
    expect(filtered.some((task) => task.urgency === 'overdue')).toBe(true);
  });

  test('computeMaintenanceDueWithinWeek returns sorted due-within-week tasks', () => {
    const tasks = computeMaintenanceDueWithinWeek(sampleRecords, '2026-07-08');
    const dueDates = tasks.map((task) => task.dueDate);
    expect([...dueDates].sort()).toEqual(dueDates);
  });

  test('excludes tasks due more than 7 days away', () => {
    const records: MaintenanceServiceRecord[] = [
      {
        id: 'soon',
        equipment: 'เครื่องชงกาแฟ',
        work_details: 'ล้างกรุ๊ปเฮด',
        start_date: '2026-06-26',
        completion_date: '2026-06-26',
        recommended_frequency: 'ทุก 1 เดือน',
      },
      {
        id: 'later',
        equipment: 'เครื่องบดเมล็ด',
        work_details: 'ใส่น้ำมันเกียร์',
        start_date: '2026-05-06',
        completion_date: '2026-05-06',
        recommended_frequency: 'ทุก 6 เดือน',
      },
    ];

    const tasks = computeMaintenanceDueWithinWeek(records, '2026-07-26');

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: 'soon',
      equipment: 'เครื่องชงกาแฟ',
      urgency: 'within_7_days',
    });
  });
});
