import { describe, expect, test } from 'vitest';
import {
  buildBeanOrderShippedPushPayload,
  shouldSendBeanOrderShippedToSubscription,
  type BeanOrderShippedNotifyInput,
} from '@/lib/bean-orders/shipment-web-push';
import type { PushSubscriptionRow } from '@/lib/web-push';

const sampleInput: BeanOrderShippedNotifyInput = {
  orderId: 'order-1',
  orderNo: 'BO-20260726-001',
  customerName: 'ทัพพ์เทพ นิจนิรันดร์กุล',
  trackingNumber: 'KEX123456789',
  carrierCode: 'kerryexpress-th',
};

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
      locale: 'th',
    },
    branch_id: 'main',
    profile_id: 'user-1',
    ...overrides,
  };
}

describe('bean order shipped web push', () => {
  test('builds payload with bean-orders detail URL and shipped metadata', () => {
    const payload = buildBeanOrderShippedPushPayload(sampleInput, 'th');

    expect(payload.kind).toBe('bean_order_shipped');
    expect(payload.title).toContain('ส่งแล้ว');
    expect(payload.body).toContain('ทัพพ์เทพ นิจนิรันดร์กุล');
    expect(payload.body).toContain('KEX123456789');
    expect(payload.title).not.toContain('BO-20260726-001');
    expect(payload.url).toBe('/th/bean-orders/order-1');
    expect(payload.tag).toBe('bb-bean-shipped-order-1');
    expect(payload.notification.metadata.kind).toBe('bean_order_shipped');
    expect(payload.notification.metadata.url).toBe('/th/bean-orders/order-1');
    expect(payload.unreadCount).toBe(1);
  });

  test('requires enabled notifications for target subscriptions', () => {
    expect(shouldSendBeanOrderShippedToSubscription(sampleSubscription())).toBe(true);
    expect(
      shouldSendBeanOrderShippedToSubscription(
        sampleSubscription({ prefs_json: { enabled: false, systemNotifications: true } }),
      ),
    ).toBe(false);
    expect(
      shouldSendBeanOrderShippedToSubscription(
        sampleSubscription({ prefs_json: { enabled: true, systemNotifications: false } }),
      ),
    ).toBe(false);
  });
});
