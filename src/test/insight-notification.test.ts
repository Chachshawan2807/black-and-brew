import { describe, expect, test } from 'vitest';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import type { Insight } from '@/lib/proactive-insights/types';
import {
  formatInsightNotification,
  insightNotificationLogId,
  isEligibleInsightNotification,
} from '@/lib/insight-notification';

function sampleInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    ruleId: 'understaffed_low_stock',
    title: 'คนน้อย',
    summary: 'สัปดาห์นี้วันที่คนน้อย: จ. 3 คน — ควรตรวจตารางงานค่ะ',
    urlPath: '/schedule',
    priority: 'high',
    modules: ['schedule'],
    ...overrides,
  };
}

function sampleInsightRow(overrides: Partial<DataChangeLogRow> = {}): DataChangeLogRow {
  const logId = insightNotificationLogId('understaffed_low_stock', '2026-07-24');
  return {
    id: 'db-uuid-1',
    occurred_at: '2026-07-24T00:00:00.000Z',
    actor_id: null,
    actor_label: 'ระบบการแจ้งเตือนที่ต้องตรวจสอบ',
    actor_access_level: 'system',
    action: 'UPDATE',
    module: 'insights',
    entity_type: 'cross_module_insight',
    entity_id: logId,
    entity_label: '2026-07-24',
    field_changes: [],
    old_value: null,
    new_value: null,
    source: 'system',
    ip_address: null,
    user_agent: null,
    status: 'success',
    error_message: null,
    metadata: {
      kind: 'proactive_insight',
      ruleId: 'understaffed_low_stock',
      url: '/th/inventory',
      notificationLogId: logId,
      title: 'คนน้อย · สต็อกต่ำ',
      summary: 'วันนี้มีพนักงานหน้าร้าน 2 คน แต่สต็อกต่ำ 12 รายการค่ะ',
      fieldSummary: 'วันนี้มีพนักงานหน้าร้าน 2 คน แต่สต็อกต่ำ 12 รายการค่ะ',
      locale: 'th',
      modules: ['schedule', 'inventory'],
      priority: 'high',
    },
    ...overrides,
  };
}

describe('insight-notification', () => {
  test('insightNotificationLogId is stable per rule and date', () => {
    expect(insightNotificationLogId('understaffed_low_stock', '2026-07-24')).toBe(
      'bb-insight-understaffed_low_stock-2026-07-24',
    );
  });

  test('isEligibleInsightNotification accepts proactive insight rows', () => {
    expect(isEligibleInsightNotification(sampleInsightRow())).toBe(true);
    expect(
      isEligibleInsightNotification(
        sampleInsightRow({ module: 'inventory', entity_type: 'item' }),
      ),
    ).toBe(false);
    expect(
      isEligibleInsightNotification(
        sampleInsightRow({
          metadata: { kind: 'daily_report' },
        }),
      ),
    ).toBe(false);
  });

  test('formatInsightNotification maps metadata into panel notification', () => {
    const notification = formatInsightNotification(sampleInsightRow(), 'th');
    expect(notification.id).toBe('bb-insight-understaffed_low_stock-2026-07-24');
    expect(notification.title).toBe('คนน้อย · สต็อกต่ำ');
    expect(notification.summary).toContain('สต็อกต่ำ');
    expect(notification.priority).toBe('high');
    expect(notification.metadata.kind).toBe('proactive_insight');
    expect(notification.metadata.url).toBe('/th/inventory');
    expect(notification.metadata.module).toBe('insights');
  });

  test('sample insight produces matching log id for dedup', () => {
    const insight = sampleInsight();
    expect(insightNotificationLogId(insight.ruleId, '2026-07-24')).toContain(insight.ruleId);
  });
});
