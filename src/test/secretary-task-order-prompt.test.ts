import { describe, expect, test } from 'vitest';
import {
  buildSecretaryTaskOrderPrompt,
  SECRETARY_TASK_ORDER_PLAYBOOK,
  SECRETARY_TASK_ORDER_SYSTEM,
} from '@/lib/secretary/task-order-prompt';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

const snapshot: SecretarySnapshot = {
  dateIso: '2026-08-29',
  locale: 'th',
  operational: {
    dateIso: '2026-08-29',
    dateDisplay: '29-08-2026',
    locale: 'th',
    headcount: 4,
    leaveCount: 1,
    offCount: 0,
    weeklyDays: [],
    pendingBeanOrders: [{ customerName: 'ลูกค้า A', paymentStatus: 'paid', fulfillmentStatus: 'pending' }],
    upcomingHoliday: null,
  },
  itemsToOrder: [],
  branchWithdrawItems: [],
  maintenanceTasks: [],
  isBranch2Day: true,
  headcountToday: 4,
};

function task(id: string, title: string): SecretaryTask {
  return {
    id,
    task_type: 'custom',
    title,
    description: null,
    priority: 'normal',
    status: 'pending',
    module: 'inventory',
    due_at: null,
    scheduled_date: '2026-08-29',
    assignee_profile_id: null,
    source_kind: 'derived',
    source_ref: null,
    source_ref_hash: null,
    action_href: null,
    metadata: null,
    completed_at: null,
    completed_by: null,
    snoozed_until: null,
    active_session_started_at: null,
    created_at: '2026-08-29T00:00:00.000Z',
    updated_at: '2026-08-29T00:00:00.000Z',
  };
}

describe('secretary task order prompt', () => {
  test('system prompt includes playbook and JSON contract', () => {
    expect(SECRETARY_TASK_ORDER_SYSTEM).toContain('orderedTaskIds');
    expect(SECRETARY_TASK_ORDER_PLAYBOOK).toContain('สาขา 2');
  });

  test('user prompt includes snapshot and task ids', () => {
    const prompt = buildSecretaryTaskOrderPrompt(
      [task('t1', 'เบิกของสาขา 2'), task('t2', 'สั่งซื้อสินค้า')],
      snapshot,
      {
        nowIso: '2026-08-29T10:00:00.000Z',
        bangkokTime: '2026-08-29 10:00',
        phase: 'open_hours',
      },
    );

    expect(prompt).toContain('วันไปสาขา 2: ใช่');
    expect(prompt).toContain('id: t1');
    expect(prompt).toContain('id: t2');
    expect(prompt).toContain('เปิดร้านแล้ว');
  });
});
