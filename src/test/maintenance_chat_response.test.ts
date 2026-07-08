import { describe, expect, test } from 'vitest';
import { isUpcomingMaintenanceQuery } from '@/lib/maintenance/detect-maintenance-query';
import { computeUpcomingMaintenanceTasks } from '@/lib/maintenance/compute-upcoming-maintenance';
import { formatMaintenanceChatResponse } from '@/lib/maintenance/format-maintenance-chat-response';
import type { MaintenanceServiceRecord } from '@/lib/maintenance/types';

const sampleRecords: MaintenanceServiceRecord[] = [
  {
    id: '1',
    equipment: 'ท่อระบายน้ำทิ้งเครื่องชงกาแฟและท่อระบายน้ำทิ้ง Rinser',
    work_details: 'ทำความสะอาดด้วยโซดาไฟและล้วงท่อ',
    start_date: '2026-04-17',
    completion_date: '2026-04-17',
    recommended_frequency: 'ทุก 3 เดือน',
    status: 'เสร็จสมบูรณ์',
  },
  {
    id: '2',
    equipment: 'เครื่องกรองน้ำ',
    work_details: 'เปลี่ยนไส้กรองหยาบ',
    start_date: '2026-04-04',
    completion_date: '2026-04-04',
    recommended_frequency: 'ทุก 3 เดือน',
    status: 'เสร็จสมบูรณ์',
  },
  {
    id: '3',
    equipment: 'แอร์ 3 เครื่อง',
    work_details: 'ล้างทำความสะอาดด้วยช่างทั้ง 3 เครื่อง',
    start_date: '2026-05-06',
    completion_date: '2026-05-06',
    recommended_frequency: 'ทุก 6 เดือน',
    status: 'เสร็จสมบูรณ์',
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

describe('formatMaintenanceChatResponse', () => {
  test('renders grouped multi-line output instead of dense single-line bullets', () => {
    const tasks = computeUpcomingMaintenanceTasks(sampleRecords, '2026-07-08');
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
