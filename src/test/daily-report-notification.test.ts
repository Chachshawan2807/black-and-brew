import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import type { DailyReportData } from '@/lib/daily-report';
import {
  dailyReportNotificationLogId,
  formatDailyReportNotification,
  isEligibleDailyReportNotification,
} from '@/lib/daily-report-notification';

function sampleDailyReportRow(
  overrides: Partial<DataChangeLogRow> = {},
): DataChangeLogRow {
  const logId = dailyReportNotificationLogId('today', '13/07/2026');
  return {
    id: 'db-uuid-1',
    occurred_at: '2026-07-13T05:00:00.000Z',
    actor_id: null,
    actor_label: 'ระบบตารางงาน',
    actor_access_level: 'system',
    action: 'UPDATE',
    module: 'schedule',
    entity_type: 'daily_report',
    entity_id: logId,
    entity_label: '13/07/2026',
    field_changes: [],
    old_value: null,
    new_value: null,
    source: 'system',
    ip_address: null,
    user_agent: null,
    status: 'success',
    error_message: null,
    metadata: {
      kind: 'daily_report',
      schedule: 'today',
      url: '/th/schedule',
      notificationLogId: logId,
      title: 'ตารางงานวันนี้',
      summary: '13/07/2026 · เข้างาน 1 คน',
      fieldSummary: '13/07/2026\nเข้างาน 1 คน\nนิต้า 6:30',
      locale: 'th',
    },
    ...overrides,
  };
}

describe('daily-report-notification', () => {
  test('dailyReportNotificationLogId matches web push tag', () => {
    expect(dailyReportNotificationLogId('tomorrow', '13/07/2026')).toBe(
      'bb-daily-report-tomorrow-13/07/2026',
    );
  });

  test('isEligibleDailyReportNotification accepts cron schedule logs only', () => {
    expect(isEligibleDailyReportNotification(sampleDailyReportRow())).toBe(true);
    expect(
      isEligibleDailyReportNotification(
        sampleDailyReportRow({
          entity_type: 'shift',
          metadata: { kind: 'daily_report' },
        }),
      ),
    ).toBe(false);
    expect(
      isEligibleDailyReportNotification(
        sampleDailyReportRow({
          module: 'inventory',
        }),
      ),
    ).toBe(false);
  });

  test('formatDailyReportNotification uses stable logId for panel dedupe', () => {
    const formatted = formatDailyReportNotification(sampleDailyReportRow(), 'th');
    expect(formatted.logId).toBe('bb-daily-report-today-13/07/2026');
    expect(formatted.id).toBe(formatted.logId);
    expect(formatted.title).toContain('ตารางงาน');
    expect(formatted.fieldSummary).toContain('นิต้า 6:30');
    expect(formatted.metadata.kind).toBe('daily_report');
  });

  test('formatDailyReportNotification prefers new_value snapshot over stale metadata', () => {
    const logId = dailyReportNotificationLogId('today', '13/09/2026');
    const formatted = formatDailyReportNotification(
      sampleDailyReportRow({
        entity_id: logId,
        metadata: {
          kind: 'daily_report',
          notificationLogId: logId,
          title: 'ตารางงานวันนี้',
          summary: 'ตารางงาน 13/09/2026 อา. (วันนี้) · เข้างาน 0 คน',
          fieldSummary: 'ตารางงาน 13/09/2026 อา. (วันนี้) · เข้างาน 0 คน',
        },
        new_value: {
          schedule: 'today',
          dateStr: '13/09/2026',
          activeStaff: [
            { name: 'ปิ่น', shiftText: '6:30' },
            { name: 'นิต้า', shiftText: '7:00' },
          ],
          otherDutyStaff: [],
          offStaff: [],
          headcount: 2,
          holiday: null,
        },
      }),
      'th',
    );

    expect(formatted.summary).toContain('เข้างาน 2 คน');
    expect(formatted.fieldSummary).toContain('ปิ่น 6:30');
    expect(formatted.fieldSummary).not.toContain('เข้างาน 0 คน');
  });

  test('daily report data type is compatible with notification log metadata', () => {
    const data: DailyReportData = {
      schedule: 'today',
      dateStr: '13/07/2026',
      activeStaff: [{ name: 'นิต้า', shiftText: '6:30' }],
      otherDutyStaff: [],
      offStaff: [],
      headcount: 1,
      holiday: null,
    };
    expect(dailyReportNotificationLogId(data.schedule, data.dateStr)).toContain(data.dateStr);
  });
});

describe('daily report notification sync', () => {
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();
  const mockInsert = vi.fn();
  const mockEqThird = vi.fn();
  const mockEqSecond = vi.fn();
  const mockEqFirst = vi.fn();
  const mockLimit = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key';

    mockLimit.mockResolvedValue({ data: [{ id: 'log-row-1' }], error: null });
    mockEqThird.mockReturnValue({ limit: mockLimit });
    mockEqSecond.mockReturnValue({ eq: mockEqThird });
    mockEqFirst.mockReturnValue({ eq: mockEqSecond });
    mockSelect.mockReturnValue({ eq: mockEqFirst });
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mockInsert.mockResolvedValue({ error: null });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        from: vi.fn(() => ({
          select: mockSelect,
          update: mockUpdate,
          insert: mockInsert,
        })),
      })),
    }));
  });

  test('updateDailyReportNotificationLog updates existing cron log with fresh shift data', async () => {
    mockLimit.mockResolvedValue({
      data: [{ id: 'log-row-1' }],
      error: null,
    });

    const { updateDailyReportNotificationLog } = await import('@/lib/daily-report-notification');
    const data: DailyReportData = {
      schedule: 'today',
      dateStr: '13/07/2026',
      activeStaff: [{ name: 'นิต้า', shiftText: '7:00' }],
      otherDutyStaff: [],
      offStaff: [{ name: 'ปิ่น', shiftText: 'วันหยุด' }],
      headcount: 1,
      holiday: null,
    };

    const result = await updateDailyReportNotificationLog(data, 'th');

    expect(result.success).toBe(true);
    expect(result.updated).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
    const updatePayload = mockUpdate.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(updatePayload).not.toHaveProperty('occurred_at');
  });

  test('recordDailyReportNotificationLog upserts when cron log already exists', async () => {
    mockLimit.mockResolvedValue({
      data: [{ id: 'log-row-1', metadata: { webPushDispatchedAt: '2026-09-13T05:01:00.000Z' } }],
      error: null,
    });

    const { recordDailyReportNotificationLog } = await import('@/lib/daily-report-notification');
    const data: DailyReportData = {
      schedule: 'today',
      dateStr: '13/09/2026',
      activeStaff: [{ name: 'ปิ่น', shiftText: '6:30' }],
      otherDutyStaff: [],
      offStaff: [],
      headcount: 1,
      holiday: null,
    };

    const result = await recordDailyReportNotificationLog(data, 'th');

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
    const updatePayload = mockUpdate.mock.calls[0]?.[0] as {
      metadata?: Record<string, unknown>;
      new_value?: { headcount?: number };
    };
    expect(updatePayload.new_value?.headcount).toBe(1);
    expect(updatePayload.metadata?.webPushDispatchedAt).toBe('2026-09-13T05:01:00.000Z');
    expect(updatePayload.metadata?.fieldSummary).toContain('เข้างาน 1 คน');
  });
});
