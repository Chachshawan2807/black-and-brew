import { describe, expect, test } from 'vitest';
import {
  buildBeanOrderDeliveredPushPayload,
  shouldSendBeanOrderDeliveredToSubscription,
  type BeanOrderDeliveredNotifyInput,
} from '@/lib/bean-orders/delivery-web-push';
import type { PushSubscriptionRow } from '@/lib/web-push';

const sampleInput: BeanOrderDeliveredNotifyInput = {
  orderId: 'order-1',
  orderNo: 'BO-20260722-003',
  customerName: 'ทัพพ์เทพ นิจนิรันดร์กุล (พ้ง)',
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

describe('bean order delivery web push', () => {
  test('builds payload with bean-orders detail URL and delivered metadata', () => {
    const payload = buildBeanOrderDeliveredPushPayload(sampleInput, 'th');

    expect(payload.kind).toBe('bean_order_delivered');
    expect(payload.title).toBe('จัดส่งสำเร็จ');
    expect(payload.body).toContain('BO-20260722-003');
    expect(payload.body).toContain('ทัพพ์เทพ');
    expect(payload.url).toBe('/th/bean-orders/order-1');
    expect(payload.tag).toBe('bb-bean-delivered-order-1');
    expect(payload.notification.metadata.kind).toBe('bean_order_delivered');
    expect(payload.notification.metadata.url).toBe('/th/bean-orders/order-1');
    expect(payload.unreadCount).toBe(1);
  });

  test('requires enabled notifications for target subscriptions', () => {
    expect(shouldSendBeanOrderDeliveredToSubscription(sampleSubscription())).toBe(true);
    expect(
      shouldSendBeanOrderDeliveredToSubscription(
        sampleSubscription({ prefs_json: { enabled: false, systemNotifications: true } }),
      ),
    ).toBe(false);
    expect(
      shouldSendBeanOrderDeliveredToSubscription(
        sampleSubscription({ prefs_json: { enabled: true, systemNotifications: false } }),
      ),
    ).toBe(false);
  });
});
