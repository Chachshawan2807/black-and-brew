import { describe, expect, test } from 'vitest';
import {
  buildBeanOrderCreatedPushPayload,
  shouldSendBeanOrderCreatedToSubscription,
  type BeanOrderCreatedNotifyInput,
} from '@/lib/bean-orders/created-web-push';
import type { PushSubscriptionRow } from '@/lib/web-push';

const sampleInput: BeanOrderCreatedNotifyInput = {
  orderId: 'order-1',
  orderNo: 'BO-20260722-003',
  customerName: 'คุณเอ',
  recipientName: 'คุณเอ ใจดี',
  lines: [
    { itemName: 'Ethiopia', weightValue: 250, weightUnit: 'g' },
    { itemName: 'Colombia', weightValue: 500, weightUnit: 'g' },
  ],
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

describe('bean order created web push', () => {
  test('builds payload with headline, customer, line summary, and bean-orders detail URL', () => {
    const payload = buildBeanOrderCreatedPushPayload(sampleInput, 'th');

    expect(payload.kind).toBe('bean_order_created');
    expect(payload.title).toBe('ออเดอร์เมล็ดกาแฟใหม่');
    expect(payload.body).toContain('คุณเอ');
    expect(payload.body).toContain('Ethiopia 250 ก.');
    expect(payload.body).toContain('Colombia 500 ก.');
    expect(payload.notification.title).toBe('ออเดอร์เมล็ดกาแฟใหม่');
    expect(payload.notification.summary).toBe('คุณเอ');
    expect(payload.notification.fieldSummary).toContain('Ethiopia 250 ก.');
    expect(payload.url).toBe('/th/bean-orders/order-1');
    expect(payload.tag).toBe('bb-bean-created-order-1');
    expect(payload.notification.metadata.kind).toBe('bean_order_created');
    expect(payload.notification.metadata.url).toBe('/th/bean-orders/order-1');
    expect(payload.unreadCount).toBe(1);
  });

  test('requires enabled notifications for target subscriptions', () => {
    expect(shouldSendBeanOrderCreatedToSubscription(sampleSubscription())).toBe(true);
    expect(
      shouldSendBeanOrderCreatedToSubscription(
        sampleSubscription({ prefs_json: { enabled: false, systemNotifications: true } }),
      ),
    ).toBe(false);
    expect(
      shouldSendBeanOrderCreatedToSubscription(
        sampleSubscription({ prefs_json: { enabled: true, systemNotifications: false } }),
      ),
    ).toBe(false);
  });
});
