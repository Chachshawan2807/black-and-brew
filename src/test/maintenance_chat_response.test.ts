import { describe, expect, test } from 'vitest';
import { isUpcomingMaintenanceQuery } from '@/lib/maintenance/detect-maintenance-query';
import { computeUpcomingMaintenanceTasks } from '@/lib/maintenance/compute-upcoming-maintenance';
import {
  filterMaintenanceTasksForChat,
  parseMaintenanceTargetMonth,
} from '@/lib/maintenance/filter-maintenance-tasks-for-chat';
import { formatMaintenanceChatResponse } from '@/lib/maintenance/format-maintenance-chat-response';
import type {
  MaintenanceServiceRecord,
  UpcomingMaintenanceTask,
} from '@/lib/maintenance/types';

const sampleRecords: MaintenanceServiceRecord[] = [
  {
    id: '1',
    equipment: 'ท่อระบายน้ำทิ้งเครื่องชงกาแฟและท่อระบายน้ำทิ้ง Rinser',
    work_details: 'ทำความสะอาดด้วยโซดาไฟและล้วงท่อ',
    start_date: '2026-04-17',
    completion_date: '2026-04-17',
    recommended_frequency: 'ทุก 3 เดือน',
  },
  {
    id: '2',
    equipment: 'เครื่องกรองน้ำ',
    work_details: 'เปลี่ยนไส้กรองหยาบ',
    start_date: '2026-04-04',
    completion_date: '2026-04-04',
    recommended_frequency: 'ทุก 3 เดือน',
  },
  {
    id: '3',
    equipment: 'แอร์ 3 เครื่อง',
    work_details: 'ล้างทำความสะอาดด้วยช่างทั้ง 3 เครื่อง',
    start_date: '2026-05-06',
    completion_date: '2026-05-06',
    recommended_frequency: 'ทุก 6 เดือน',
  },
];

describe('detect-maintenance-query', () => {
  test('detects upcoming maintenance summary prompts', () => {
    expect(
      isUpcomingMaintenanceQuery(
        'ขอรายการงานซ่อมบำรุงที่ควรทำในอนาคตอันใกล้ และคำแนะนำเบื้องต้น',
      ),
    ).toBe(true);
    expect(isUpcomingMaintenanceQuery('สถานะซ่อมบำรุงอุปกรณ์')).toBe(true);
  });

  test('does not treat specific repair troubleshooting as summary query', () => {
    expect(isUpcomingMaintenanceQuery('เครื่องชงกาแฟเสียวันนี้ควรทำอย่างไร')).toBe(false);
  });
});

describe('compute-upcoming-maintenance', () => {
  test('computes next due dates from completion date and frequency', () => {
    const tasks = computeUpcomingMaintenanceTasks(sampleRecords, '2026-07-08');

    expect(tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          equipment: 'เครื่องกรองน้ำ',
          dueDate: '2026-07-04',
          advice: 'เปลี่ยนไส้กรองหยาบ',
        }),
        expect.objectContaining({
          equipment: 'ท่อระบายน้ำทิ้งเครื่องชงกาแฟและท่อระบายน้ำทิ้ง Rinser',
          dueDate: '2026-07-17',
        }),
      ]),
    );
  });

  test('sorts tasks by due date ascending', () => {
    const tasks = computeUpcomingMaintenanceTasks(sampleRecords, '2026-07-08');
    const dueDates = tasks.map((task) => task.dueDate);
    const sorted = [...dueDates].sort();
    expect(dueDates).toEqual(sorted);
  });
});

const mixedUrgencyTasks: UpcomingMaintenanceTask[] = [
  {
    id: 'overdue',
    equipment: 'เครื่องกรองน้ำ',
    advice: 'เปลี่ยนไส้กรองหยาบ',
    dueDate: '2026-07-04',
    urgency: 'overdue',
  },
  {
    id: 'week',
    equipment: 'เครื่องชงกาแฟ',
    advice: 'ล้างกรุ๊ปเฮด',
    dueDate: '2026-07-12',
    urgency: 'within_7_days',
  },
  {
    id: 'month',
    equipment: 'เครื่องบดกาแฟ',
    advice: 'ทำความสะอาดใบมีด',
    dueDate: '2026-07-28',
    urgency: 'within_30_days',
  },
  {
    id: 'august',
    equipment: 'แอร์ 3 เครื่อง',
    advice: 'ล้างทำความสะอาดด้วยช่างทั้ง 3 เครื่อง',
    dueDate: '2026-08-15',
    urgency: 'within_90_days',
  },
  {
    id: 'later',
    equipment: 'ปั๊มน้ำ',
    advice: 'ตรวจสอบแรงดัน',
    dueDate: '2027-01-15',
    urgency: 'later',
  },
];

describe('filterMaintenanceTasksForChat', () => {
  test('keeps only overdue and within-one-month tasks for default upcoming query', () => {
    const filtered = filterMaintenanceTasksForChat(
      mixedUrgencyTasks,
      'ขอรายการงานซ่อมบำรุงที่ควรทำในอนาคตอันใกล้ และคำแนะนำเบื้องต้น',
      '2026-07-08',
    );

    expect(filtered.map((task) => task.id)).toEqual(['overdue', 'week', 'month']);
  });

  test('includes overdue tasks and tasks due in the requested month', () => {
    const filtered = filterMaintenanceTasksForChat(
      mixedUrgencyTasks,
      'ขอรายการงานซ่อมบำรุงเดือนสิงหาคม',
      '2026-07-08',
    );

    expect(filtered.map((task) => task.id)).toEqual(['overdue', 'august']);
  });

  test('does not treat horizon phrases as a specific calendar month', () => {
    expect(
      parseMaintenanceTargetMonth('งานซ่อมบำรุงภายใน 1 เดือน', '2026-07-08'),
    ).toBeNull();
  });
});

describe('formatMaintenanceChatResponse', () => {
  test('renders grouped multi-line output instead of dense single-line bullets', () => {
    const tasks = filterMaintenanceTasksForChat(
      computeUpcomingMaintenanceTasks(sampleRecords, '2026-07-08'),
      'ขอรายการงานซ่อมบำรุงที่ควรทำในอนาคตอันใกล้ และคำแนะนำเบื้องต้น',
      '2026-07-08',
    );
    const text = formatMaintenanceChatResponse(tasks);

    expect(text).toContain('🔧 งานซ่อมบำรุงที่ควรทำในอนาคตอันใกล้');
    expect(text).toContain('เลยกำหนดแล้ว');
    expect(text).toContain('04-07-2026');
    expect(text).toContain('เครื่องกรองน้ำ');
    expect(text).toContain('เปลี่ยนไส้กรองหยาบ');
    expect(text).not.toMatch(/• .+ — แนะนำ: .+ \| ครบกำหนด:/);
    expect(text).toContain('รวม');
  });

  test('returns empty-state message when no tasks are due', () => {
    const text = formatMaintenanceChatResponse([]);
    expect(text).toContain('ไม่มีรายการซ่อมบำรุงที่ค้างอยู่ในขณะนี้');
  });
});
