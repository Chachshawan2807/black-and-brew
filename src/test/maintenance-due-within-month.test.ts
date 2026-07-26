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

  test('keeps only the latest service per equipment when recomputing due dates', () => {
    const records: MaintenanceServiceRecord[] = [
      {
        id: 'old',
        equipment: 'เครื่องกรองน้ำ',
        work_details: 'เปลี่ยนไส้กรองหยาบ',
        start_date: '2026-04-04',
        completion_date: '2026-04-04',
        recommended_frequency: 'ทุก 3 เดือน',
      },
      {
        id: 'new',
        equipment: 'เครื่องกรองน้ำ',
        work_details: 'เปลี่ยนไส้กรองละเอียด',
        start_date: '2026-07-20',
        completion_date: '2026-07-20',
        recommended_frequency: 'ทุก 3 เดือน',
      },
    ];

    const tasks = computeMaintenanceDueWithinMonth(records, '2026-07-26');

    expect(tasks).toHaveLength(0);
    expect(computeUpcomingMaintenanceTasks(records, '2026-07-26')).toEqual([
      expect.objectContaining({
        id: 'new',
        equipment: 'เครื่องกรองน้ำ',
        dueDate: '2026-10-20',
        advice: 'เปลี่ยนไส้กรองละเอียด',
      }),
    ]);
  });

  test('treats equipment names with spacing differences as the same asset', () => {
    const records: MaintenanceServiceRecord[] = [
      {
        id: 'a',
        equipment: 'เครื่อง ชงกาแฟ',
        work_details: 'ล้างกรุ๊ปเฮด',
        start_date: '2026-06-01',
        completion_date: '2026-06-01',
        recommended_frequency: 'ทุก 1 เดือน',
      },
      {
        id: 'b',
        equipment: 'เครื่องชงกาแฟ',
        work_details: 'ล้างกรุ๊ปเฮดรอบใหม่',
        start_date: '2026-07-10',
        completion_date: '2026-07-10',
        recommended_frequency: 'ทุก 1 เดือน',
      },
    ];

    const tasks = computeUpcomingMaintenanceTasks(records, '2026-07-26');

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: 'b',
      equipment: 'เครื่องชงกาแฟ',
      dueDate: '2026-08-10',
    });
  });
});

describe('formatDueDateWithDaysRemaining', () => {
  test('formats upcoming due date with remaining days', () => {
    expect(formatDueDateWithDaysRemaining('2026-08-15', '2026-07-26')).toBe(
      '15-08-2026 (20 วัน)',
    );
  });

  test('formats due today and overdue days', () => {
    expect(formatDueDateWithDaysRemaining('2026-07-26', '2026-07-26')).toBe(
      '26-07-2026 (วันนี้)',
    );
    expect(formatDueDateWithDaysRemaining('2026-07-20', '2026-07-26')).toBe(
      '20-07-2026 (เลย 6 วัน)',
    );
  });
});
