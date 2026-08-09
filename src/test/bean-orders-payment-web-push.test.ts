import { describe, expect, test } from 'vitest';
import {
  buildBeanOrderPaymentPushPayload,
  shouldSendBeanOrderPaymentToSubscription,
  type BeanOrderPaymentNotifyInput,
} from '@/lib/bean-orders/payment-web-push';
import type { PushSubscriptionRow } from '@/lib/web-push';

const sampleInput: BeanOrderPaymentNotifyInput = {
  orderId: 'order-1',
  orderNo: 'BO-20260722-003',
  customerName: 'คุณเอ',
  totalBaht: 800,
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

describe('bean order payment web push', () => {
  test('builds payload with bean-orders detail URL and payment metadata', () => {
    const payload = buildBeanOrderPaymentPushPayload(sampleInput, 'th');

    expect(payload.kind).toBe('bean_order_payment_confirmed');
    expect(payload.title).toContain('ชำระแล้ว');
    expect(payload.body).toContain('คุณเอ');
    expect(payload.body).toContain('800');
    expect(payload.url).toBe('/th/bean-orders/order-1');
    expect(payload.tag).toBe('bb-bean-paid-order-1');
    expect(payload.notification.metadata.kind).toBe('bean_order_payment_confirmed');
    expect(payload.notification.metadata.url).toBe('/th/bean-orders/order-1');
    expect(payload.unreadCount).toBe(1);
  });

  test('requires enabled notifications for target subscriptions', () => {
    expect(shouldSendBeanOrderPaymentToSubscription(sampleSubscription())).toBe(true);
    expect(
      shouldSendBeanOrderPaymentToSubscription(
        sampleSubscription({ prefs_json: { enabled: false, systemNotifications: true } }),
      ),
    ).toBe(false);
    expect(
      shouldSendBeanOrderPaymentToSubscription(
        sampleSubscription({ prefs_json: { enabled: true, systemNotifications: false } }),
      ),
    ).toBe(false);
  });
});
