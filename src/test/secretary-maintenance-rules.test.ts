import { describe, expect, test } from 'vitest';
import { deriveMaintenanceTasks } from '@/lib/secretary/rules/maintenance-rules';
import type { SecretarySnapshot } from '@/lib/secretary/types';
import type { UpcomingMaintenanceTask } from '@/lib/maintenance/types';

function task(partial: Pick<UpcomingMaintenanceTask, 'id' | 'urgency'> & Partial<UpcomingMaintenanceTask>): UpcomingMaintenanceTask {
  return {
    equipment: partial.id,
    advice: '',
    dueDate: '2026-09-14',
    ...partial,
  };
}

function snapshot(maintenanceTasks: UpcomingMaintenanceTask[]): SecretarySnapshot {
  return {
    dateIso: '2026-09-14',
    locale: 'th',
    operational: {
      dateIso: '2026-09-14',
      dateDisplay: '14/09/2026',
      locale: 'th',
      headcount: 0,
      leaveCount: 0,
      offCount: 0,
      weeklyDays: [],
      pendingBeanOrders: [],
      upcomingHoliday: null,
    },
    itemsToOrder: [],
    branchWithdrawItems: [],
    inventoryCatalogItems: [],
    maintenanceTasks,
    isBranch2Day: false,
    headcountToday: 0,
  };
}

describe('deriveMaintenanceTasks', () => {
  test('creates overdue and within-7-day cards, not a 30-day window', () => {
    const tasks = deriveMaintenanceTasks(
      snapshot([
        task({ id: 'late', urgency: 'overdue', equipment: 'เครื่องบด' }),
        task({ id: 'soon', urgency: 'within_7_days', equipment: 'เครื่องชง' }),
        task({ id: 'later', urgency: 'within_30_days', equipment: 'ตู้เย็น' }),
      ]),
    );

    expect(tasks.map((entry) => entry.taskType)).toEqual([
      'maintenance_overdue',
      'maintenance_due',
    ]);
    expect(tasks[0]?.title).toBe('ซ่อมบำรุง (1)');
    expect(tasks[0]?.description).toContain('เครื่องบด');
    expect(tasks[1]?.description).toContain('เครื่องชง');
    expect(tasks[1]?.description).not.toContain('ตู้เย็น');
  });

  test('does not create a due-soon card for only 30-day items', () => {
    const tasks = deriveMaintenanceTasks(
      snapshot([task({ id: 'later', urgency: 'within_30_days', equipment: 'ตู้เย็น' })]),
    );

    expect(tasks).toEqual([]);
  });
});
