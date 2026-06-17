import { describe, expect, test } from 'vitest';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import {
  buildWebPushPayload,
  parsePushPrefs,
  shouldSendPushToSubscription,
  type PushSubscriptionRow,
} from '@/lib/web-push';

function sampleRow(overrides: Partial<DataChangeLogRow> = {}): DataChangeLogRow {
  return {
    id: 'log-1',
    occurred_at: '2026-06-16T10:00:00.000Z',
    actor_id: null,
    actor_label: 'ผู้ใช้งาน',
    actor_access_level: 'full',
    action: 'UPDATE',
    module: 'inventory',
    entity_type: 'inventory_item',
    entity_id: 'item-1',
    entity_label: 'กาแฟ',
    field_changes: [{ field: 'stock', old_value: 0, new_value: 2 }],
    old_value: null,
    new_value: null,
    source: 'server_action',
    ip_address: null,
    user_agent: null,
    status: 'success',
    error_message: null,
    metadata: {
      notificationSource: 'inventory_quick_action_fab',
      operation: 'record_transaction',
      type: 'IN',
      quantity: 2,
      clientSessionId: 'device-a',
    },
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
    client_session_id: 'device-b',
    user_agent: 'Vitest',
    prefs_json: {
      enabled: true,
      systemNotifications: true,
      notifyOwnChanges: false,
      notifyCreate: true,
      notifyUpdate: true,
      notifyDelete: true,
      locale: 'th',
    },
    ...overrides,
  };
}

describe('web-push', () => {
  test('parsePushPrefs merges defaults and locale', () => {
    const prefs = parsePushPrefs({ enabled: false, locale: 'en' });
    expect(prefs.enabled).toBe(false);
    expect(prefs.locale).toBe('en');
    expect(prefs.notifyUpdate).toBe(true);
  });

  test('buildWebPushPayload formats eligible inventory row', () => {
    const payload = buildWebPushPayload(sampleRow(), 'th');
    expect(payload).not.toBeNull();
    expect(payload?.title).toContain('รับเข้า');
    expect(payload?.url).toContain('/th/inventory?highlight=item-1');
    expect(payload?.notification.logId).toBe('log-1');
    expect(payload?.notification.entityLabel).toBe('กาแฟ');
    expect(payload?.unreadCount).toBe(1);
  });

  test('shouldSendPushToSubscription skips origin device session', () => {
    const row = sampleRow({ metadata: { ...sampleRow().metadata, clientSessionId: 'device-b' } });
    const subscription = sampleSubscription({ client_session_id: 'device-b' });
    expect(shouldSendPushToSubscription(row, subscription)).toBe(false);
  });

  test('shouldSendPushToSubscription sends to other devices', () => {
    const row = sampleRow();
    const subscription = sampleSubscription({ client_session_id: 'device-b' });
    expect(shouldSendPushToSubscription(row, subscription)).toBe(true);
  });

  test('shouldSendPushToSubscription respects disabled prefs', () => {
    const row = sampleRow();
    const subscription = sampleSubscription({
      prefs_json: { enabled: false, systemNotifications: false },
    });
    expect(shouldSendPushToSubscription(row, subscription)).toBe(false);
  });
});
