import { describe, expect, test } from 'vitest';
import type { DailyReportData } from '@/app/actions/daily-report-actions';
import {
  buildDailyReportPushPayload,
  shouldSendDailyReportToSubscription,
  type DailyReportPushPayload,
} from '@/lib/daily-report-web-push';
import type { PushSubscriptionRow } from '@/lib/web-push';

function sampleReport(overrides: Partial<DailyReportData> = {}): DailyReportData {
  return {
    schedule: 'today',
    dateStr: '21-06-2026',
    activeStaff: [{ name: 'นิต้า', shiftText: '6:30' }],
    otherDutyStaff: [],
    offStaff: [{ name: 'ชัช', shiftText: 'วันหยุด' }],
    headcount: 1,
    holiday: null,
    ...overrides,
  };
}

function sampleSubscription(overrides: Partial<PushSubscriptionRow> = {}): PushSubscriptionRow {
  return {
    id: 'sub-1',
    user_id: 'user-1',
    endpoint: 'https://push.example/1',
    p256dh: 'key',
    auth: 'auth',
    client_session_id: null,
    user_agent: 'Vitest',
    prefs_json: {
      enabled: true,
      systemNotifications: true,
      dailyScheduleReports: true,
      locale: 'th',
    },
    branch_id: 'main',
    profile_id: 'user-1',
    ...overrides,
  };
}

describe('daily-report-web-push', () => {
  test('buildDailyReportPushPayload includes schedule metadata and schedule URL', () => {
    const payload = buildDailyReportPushPayload(sampleReport({ schedule: 'tomorrow' }), 'th');
    expect(payload.kind).toBe('daily_report');
    expect(payload.schedule).toBe('tomorrow');
    expect(payload.title).toContain('ตารางงาน');
    expect(payload.body).toContain('21-06-2026');
    expect(payload.url).toBe('/th/schedule');
    expect(payload.tag).toContain('bb-daily-report-tomorrow');
  });

  test('shouldSendDailyReportToSubscription requires dailyScheduleReports and systemNotifications', () => {
    const report = sampleReport();
    expect(shouldSendDailyReportToSubscription(report, sampleSubscription())).toBe(true);
    expect(
      shouldSendDailyReportToSubscription(
        report,
        sampleSubscription({ prefs_json: { dailyScheduleReports: false } })
      )
    ).toBe(false);
    expect(
      shouldSendDailyReportToSubscription(
        report,
        sampleSubscription({ prefs_json: { systemNotifications: false } })
      )
    ).toBe(true);
  });

  test('shouldSendDailyReportToSubscription filters by branch_id', () => {
    const report = sampleReport();
    expect(
      shouldSendDailyReportToSubscription(
        report,
        sampleSubscription({ branch_id: 'branch-2' }),
        'main'
      )
    ).toBe(false);
    expect(
      shouldSendDailyReportToSubscription(
        report,
        sampleSubscription({ branch_id: 'main' }),
        'main'
      )
    ).toBe(true);
  });

  test('payload is JSON-serializable for web-push', () => {
    const payload: DailyReportPushPayload = buildDailyReportPushPayload(sampleReport(), 'th');
    expect(() => JSON.stringify(payload)).not.toThrow();
    expect(JSON.parse(JSON.stringify(payload)).kind).toBe('daily_report');
  });
});
