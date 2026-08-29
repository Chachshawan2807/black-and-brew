import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchSecretarySnapshot: vi.fn(),
  fetchSecretaryTasks: vi.fn(),
  generateSecretaryTaskOrder: vi.fn(),
  recordSecretaryNotificationLog: vi.fn(),
  markSecretaryMorningPushDispatched: vi.fn(),
  ensureVapidConfigured: vi.fn(),
  getSupabaseAdminForPush: vi.fn(),
  deliverWebPushPayload: vi.fn(),
}));

vi.mock('@/lib/secretary/adapters', () => ({
  fetchSecretarySnapshot: mocks.fetchSecretarySnapshot,
}));

vi.mock('@/app/actions/secretary-actions', () => ({
  fetchSecretaryTasks: mocks.fetchSecretaryTasks,
}));

vi.mock('@/lib/secretary/generate-task-order', () => ({
  generateSecretaryTaskOrder: mocks.generateSecretaryTaskOrder,
}));

vi.mock('@/lib/secretary/alerts/secretary-notification-log', () => ({
  recordSecretaryNotificationLog: mocks.recordSecretaryNotificationLog,
  markSecretaryMorningPushDispatched: mocks.markSecretaryMorningPushDispatched,
}));

vi.mock('@/lib/web-push', () => ({
  ensureVapidConfigured: mocks.ensureVapidConfigured,
  getSupabaseAdminForPush: mocks.getSupabaseAdminForPush,
  deliverWebPushPayload: mocks.deliverWebPushPayload,
  WEB_PUSH_SCHEDULE_TTL_SECONDS: 3600,
}));

import { evaluateSecretaryAlerts } from '@/lib/secretary/alerts/evaluate-and-dispatch';

const snapshot = {
  dateIso: '2026-08-29',
  locale: 'th',
  operational: {},
  itemsToOrder: [],
  branchWithdrawItems: [],
  maintenanceTasks: [],
  isBranch2Day: false,
  headcountToday: 4,
};

const tasks = [
  {
    id: 'task-1',
    task_type: 'custom',
    title: 'งาน A',
    description: null,
    priority: 'normal',
    status: 'pending',
    module: 'custom',
    due_at: null,
    scheduled_date: '2026-08-29',
    assignee_profile_id: null,
    source_kind: 'manual',
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
  },
];

describe('evaluateSecretaryAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchSecretarySnapshot.mockResolvedValue(snapshot);
    mocks.fetchSecretaryTasks.mockResolvedValue({ success: true, tasks });
    mocks.generateSecretaryTaskOrder.mockResolvedValue({
      orderedTaskIds: ['task-1'],
      orderedTasks: tasks,
      fingerprint: 'abc',
      source: 'ai',
    });
    mocks.recordSecretaryNotificationLog.mockResolvedValue({
      success: true,
      logId: 'secretary-digest-2026-08-29',
    });
    mocks.ensureVapidConfigured.mockReturnValue(false);
  });

  test('records guidance and skips push when VAPID is not configured', async () => {
    const result = await evaluateSecretaryAlerts({ locale: 'th' });

    expect(mocks.generateSecretaryTaskOrder).toHaveBeenCalledWith({ tasks, snapshot });
    expect(mocks.recordSecretaryNotificationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        guidanceText: expect.stringContaining('งาน A'),
        trigger: 'cron',
      }),
    );
    expect(result.guidanceText).toContain('งาน A');
    expect(result.pushed.skipped).toBe(true);
  });

  test('skips push when morning digest already dispatched', async () => {
    mocks.recordSecretaryNotificationLog.mockResolvedValue({
      success: true,
      skipped: true,
      logId: 'secretary-digest-2026-08-29',
    });

    const result = await evaluateSecretaryAlerts({ locale: 'th' });
    expect(result.recorded.skipped).toBe(true);
    expect(result.pushed.skipped).toBe(true);
    expect(mocks.markSecretaryMorningPushDispatched).not.toHaveBeenCalled();
  });
});
