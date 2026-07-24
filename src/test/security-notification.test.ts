import { describe, expect, test } from 'vitest';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import {
  formatSecurityNotification,
  isEligibleSecurityNotification,
  PIN_LOCKOUT_KIND,
} from '@/lib/security-notification';
import {
  maskClientIp,
  pinLockoutNotificationLogId,
} from '@/lib/security-notification-server';

function samplePinLockoutRow(overrides: Partial<DataChangeLogRow> = {}): DataChangeLogRow {
  const logId = pinLockoutNotificationLogId('203.150.1.42', '2026-07-24-12');
  return {
    id: 'db-uuid-1',
    occurred_at: '2026-07-24T00:00:00.000Z',
    actor_id: null,
    actor_label: 'ระบบความปลอดภัย',
    actor_access_level: 'system',
    action: 'UPDATE',
    module: 'security',
    entity_type: PIN_LOCKOUT_KIND,
    entity_id: logId,
    entity_label: '203.150.1.*',
    field_changes: [],
    old_value: null,
    new_value: null,
    source: 'system',
    ip_address: '203.150.1.42',
    user_agent: null,
    status: 'success',
    error_message: null,
    metadata: {
      kind: PIN_LOCKOUT_KIND,
      url: '/th/settings',
      notificationLogId: logId,
      title: '⚠️ มีการพยายามเดา PIN',
      summary: 'IP 203.150.1.* ถูก lockout ประมาณ 15 นาที',
      fieldSummary: 'ตรวจพบการใส่ PIN ผิดซ้ำจากภายนอก',
      locale: 'th',
      priority: 'high',
    },
    ...overrides,
  };
}

describe('security-notification', () => {
  test('maskClientIp hides last IPv4 octet', () => {
    expect(maskClientIp('203.150.1.42')).toBe('203.150.1.*');
  });

  test('pinLockoutNotificationLogId is stable per IP and hour bucket', () => {
    expect(pinLockoutNotificationLogId('1.2.3.4', '2026-07-24-12')).toMatch(/^bb-pin-lockout-/);
  });

  test('isEligibleSecurityNotification accepts pin lockout rows only', () => {
    expect(isEligibleSecurityNotification(samplePinLockoutRow())).toBe(true);
    expect(
      isEligibleSecurityNotification(
        samplePinLockoutRow({ metadata: { kind: 'firewall_attack' } }),
      ),
    ).toBe(false);
    expect(isEligibleSecurityNotification(samplePinLockoutRow({ module: 'inventory' }))).toBe(false);
  });

  test('formatSecurityNotification maps metadata into panel notification', () => {
    const notification = formatSecurityNotification(samplePinLockoutRow(), 'th');
    expect(notification.priority).toBe('high');
    expect(notification.title).toContain('PIN');
    expect(notification.metadata.kind).toBe(PIN_LOCKOUT_KIND);
    expect(notification.metadata.url).toBe('/th/settings');
  });
});
