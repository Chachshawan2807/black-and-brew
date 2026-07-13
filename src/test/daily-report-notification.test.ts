import { describe, expect, test } from 'vitest';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import type { DailyReportData } from '@/app/actions/daily-report-actions';
import {
  dailyReportNotificationLogId,
  formatDailyReportNotification,
  isEligibleDailyReportNotification,
} from '@/lib/daily-report-notification';

function sampleDailyReportRow(
  overrides: Partial<DataChangeLogRow> = {},
): DataChangeLogRow {
  const logId = dailyReportNotificationLogId('today', '13-07-2026');
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
    entity_label: '13-07-2026',
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
      summary: '13-07-2026 · เข้างาน 1 คน',
      fieldSummary: '13-07-2026\nเข้างาน 1 คน\nนิต้า 6:30',
      locale: 'th',
    },
    ...overrides,
  };
}

describe('daily-report-notification', () => {
  test('dailyReportNotificationLogId matches web push tag', () => {
    expect(dailyReportNotificationLogId('tomorrow', '13-07-2026')).toBe(
      'bb-daily-report-tomorrow-13-07-2026',
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
    expect(formatted.logId).toBe('bb-daily-report-today-13-07-2026');
    expect(formatted.id).toBe(formatted.logId);
    expect(formatted.title).toContain('ตารางงาน');
    expect(formatted.fieldSummary).toContain('นิต้า 6:30');
    expect(formatted.metadata.kind).toBe('daily_report');
  });

  test('daily report data type is compatible with notification log metadata', () => {
    const data: DailyReportData = {
      schedule: 'today',
      dateStr: '13-07-2026',
      activeStaff: [{ name: 'นิต้า', shiftText: '6:30' }],
      otherDutyStaff: [],
      offStaff: [],
      headcount: 1,
      holiday: null,
    };
    expect(dailyReportNotificationLogId(data.schedule, data.dateStr)).toContain(data.dateStr);
  });
});
