import { describe, expect, test } from 'vitest';
import type { Insight } from '@/lib/proactive-insights/types';
import {
  buildInsightPushPayload,
  selectInsightTargetSubscriptions,
  shouldSendInsightToSubscription,
} from '@/lib/insight-web-push';
import { insightNotificationLogId } from '@/lib/insight-notification';
import type { PushSubscriptionRow } from '@/lib/web-push';

function sampleInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    ruleId: 'leave_coverage_risk',
    title: 'ลา · สต็อกต่ำ',
    summary: 'พนักงานลา 3 คน สต็อกต่ำ 8 รายการ — ควรตรวจสอบก่อนเปิดร้านค่ะ',
    urlPath: '/schedule',
    priority: 'high',
    modules: ['schedule', 'inventory'],
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
      proactiveInsights: true,
      locale: 'th',
    },
    branch_id: 'main',
    profile_id: 'user-1',
    ...overrides,
  };
}

describe('insight-web-push', () => {
  test('buildInsightPushPayload includes deep link and tag', () => {
    const insight = sampleInsight();
    const payload = buildInsightPushPayload(insight, '2026-07-24', 'th');
    expect(payload.kind).toBe('proactive_insight');
    expect(payload.ruleId).toBe('leave_coverage_risk');
    expect(payload.url).toBe('/th/schedule');
    expect(payload.tag).toBe(insightNotificationLogId('leave_coverage_risk', '2026-07-24'));
    expect(payload.notification.metadata.kind).toBe('proactive_insight');
    expect(payload.assets.icon).toBe('/images/push-notification-icon.png');
  });

  test('shouldSendInsightToSubscription requires proactiveInsights pref', () => {
    const insight = sampleInsight();
    expect(shouldSendInsightToSubscription(insight, sampleSubscription())).toBe(true);
    expect(
      shouldSendInsightToSubscription(
        insight,
        sampleSubscription({ prefs_json: { enabled: true, proactiveInsights: false } }),
      ),
    ).toBe(false);
    expect(
      shouldSendInsightToSubscription(
        insight,
        sampleSubscription({ prefs_json: { enabled: false, proactiveInsights: true } }),
      ),
    ).toBe(false);
  });

  test('selectInsightTargetSubscriptions falls back when branch has no match', () => {
    const main = sampleSubscription({ id: 'main-sub', branch_id: 'main' });
    const other = sampleSubscription({ id: 'other-sub', branch_id: 'other' });
    const disabled = sampleSubscription({
      id: 'disabled-sub',
      branch_id: 'main',
      prefs_json: { enabled: false, proactiveInsights: true },
    });

    const result = selectInsightTargetSubscriptions([main, other, disabled], 'missing');
    expect(result.branchRows).toHaveLength(0);
    expect(result.eligibleRows).toHaveLength(2);
    expect(result.branchFallback).toBe(true);
  });
});
