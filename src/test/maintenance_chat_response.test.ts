import { describe, expect, test } from 'vitest';
import { isUpcomingMaintenanceQuery } from '@/lib/maintenance/detect-maintenance-query';
import { computeUpcomingMaintenanceTasks } from '@/lib/maintenance/compute-upcoming-maintenance';
import {
  filterMaintenanceTasksForChat,
  parseMaintenanceTargetMonth,
} from '@/lib/maintenance/filter-maintenance-tasks-for-chat';
import { formatMaintenanceChatResponse } from '@/lib/maintenance/format-maintenance-chat-response';
import type { UpcomingMaintenanceTask } from '@/lib/maintenance/types';
import {
  REAL_MONTH_FILTER_SAMPLE_RECORDS,
  REAL_SCHEDULED_SAMPLE_RECORDS,
  REAL_SERVICE_RECORD_REFERENCE_DATE,
} from '@/test/fixtures/service-records.fixture';

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
    expect(
      isUpcomingMaintenanceQuery('ท่อระบายน้ำเครื่องชงกาแฟเสียวันนี้ควรทำอย่างไร'),
    ).toBe(false);
  });
});

describe('compute-upcoming-maintenance', () => {
  test('computes next due dates from completion date and frequency', () => {
    const tasks = computeUpcomingMaintenanceTasks(
      REAL_SCHEDULED_SAMPLE_RECORDS,
      REAL_SERVICE_RECORD_REFERENCE_DATE,
    );

    expect(tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          equipment: 'ไส้กรอง PP เครื่องชง',
          dueDate: '2026-09-25',
          advice: 'เปลี่ยนอะไหล่',
        }),
        expect.objectContaining({
          equipment: 'ท่อระบายน้ำเครื่องชงกาแฟ',
          dueDate: '2026-09-25',
        }),
      ]),
    );
  });

  test('sorts tasks by due date ascending', () => {
    const tasks = computeUpcomingMaintenanceTasks(
      REAL_SCHEDULED_SAMPLE_RECORDS,
      REAL_SERVICE_RECORD_REFERENCE_DATE,
    );
    const dueDates = tasks.map((task) => task.dueDate);
    const sorted = [...dueDates].sort();
    expect(dueDates).toEqual(sorted);
  });
});

const mixedUrgencyTasks: UpcomingMaintenanceTask[] = [
  {
    id: 'overdue',
    equipment: 'ซิงค์ล้างจานบาร์ชง',
    advice: 'ล้างทำความสะอาดด้วยโซดาไฟ',
    dueDate: '2026-08-26',
    urgency: 'overdue',
  },
  {
    id: 'week',
    equipment: 'ไส้กรอง PP เครื่องชง',
    advice: 'เปลี่ยนอะไหล่',
    dueDate: '2026-09-05',
    urgency: 'within_7_days',
  },
  {
    id: 'month',
    equipment: 'ท่อระบายน้ำเครื่องชงกาแฟ',
    advice: 'ล้างทำความสะอาดด้วยโซดาไฟ',
    dueDate: '2026-09-25',
    urgency: 'within_30_days',
  },
  {
    id: 'october',
    equipment: 'แอร์ 3 ห้องคั่ว',
    advice: 'ล้างทำความสะอาดด้วยช่าง',
    dueDate: '2026-10-26',
    urgency: 'within_90_days',
  },
  {
    id: 'later',
    equipment: 'ไส้กรอง Resin เครื่องทำน้ำแข็ง',
    advice: 'เปลี่ยนอะไหล่',
    dueDate: '2027-01-15',
    urgency: 'later',
  },
];

describe('filterMaintenanceTasksForChat', () => {
  test('keeps only overdue and within-one-month tasks for default upcoming query', () => {
    const filtered = filterMaintenanceTasksForChat(
      mixedUrgencyTasks,
      'ขอรายการงานซ่อมบำรุงที่ควรทำในอนาคตอันใกล้ และคำแนะนำเบื้องต้น',
      REAL_SERVICE_RECORD_REFERENCE_DATE,
    );

    expect(filtered.map((task) => task.id)).toEqual(['overdue', 'week', 'month']);
  });

  test('includes overdue tasks and tasks due in the requested month', () => {
    const filtered = filterMaintenanceTasksForChat(
      mixedUrgencyTasks,
      'ขอรายการงานซ่อมบำรุงเดือนตุลาคม',
      REAL_SERVICE_RECORD_REFERENCE_DATE,
    );

    expect(filtered.map((task) => task.id)).toEqual(['overdue', 'october']);
  });

  test('does not treat horizon phrases as a specific calendar month', () => {
    expect(
      parseMaintenanceTargetMonth('งานซ่อมบำรุงภายใน 1 เดือน', REAL_SERVICE_RECORD_REFERENCE_DATE),
    ).toBeNull();
  });
});

describe('formatMaintenanceChatResponse', () => {
  test('renders grouped multi-line output instead of dense single-line bullets', () => {
    const tasks = filterMaintenanceTasksForChat(
      computeUpcomingMaintenanceTasks(
        REAL_MONTH_FILTER_SAMPLE_RECORDS,
        REAL_SERVICE_RECORD_REFERENCE_DATE,
      ),
      'ขอรายการงานซ่อมบำรุงที่ควรทำในอนาคตอันใกล้ และคำแนะนำเบื้องต้น',
      REAL_SERVICE_RECORD_REFERENCE_DATE,
    );
    const text = formatMaintenanceChatResponse(tasks);

    expect(text).toContain('🔧 งานซ่อมบำรุงที่ควรทำในอนาคตอันใกล้');
    expect(text).toContain('เลยกำหนดแล้ว');
    expect(text).toContain('26-08-2026');
    expect(text).toContain('ซิงค์ล้างจานบาร์ชง');
    expect(text).toContain('ล้างทำความสะอาดด้วยโซดาไฟ');
    expect(text).not.toMatch(/• .+ แนะนำ: .+ \| ครบกำหนด:/);
    expect(text).toContain('รวม');
  });

  test('returns empty-state message when no tasks are due', () => {
    const text = formatMaintenanceChatResponse([]);
    expect(text).toContain('ไม่มีรายการซ่อมบำรุงที่ค้างอยู่ในขณะนี้');
  });
});
