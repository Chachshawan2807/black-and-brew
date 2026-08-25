import { describe, expect, test } from 'vitest';
import {
  applyBeanOrderDeliveredPatch,
  buildBeanOrderDeliveredNotifyInput,
} from '@/lib/bean-orders/delivered-notify-snapshot';

describe('bean order delivered optimistic patch', () => {
  test('applyBeanOrderDeliveredPatch marks only the matching order as delivered', () => {
    const orders = [
      { id: 'a', trackingStatus: null },
      { id: 'b', trackingStatus: 'in_transit' },
    ];

    expect(applyBeanOrderDeliveredPatch(orders, 'b')).toEqual([
      { id: 'a', trackingStatus: null },
      { id: 'b', trackingStatus: 'delivered' },
    ]);
    expect(applyBeanOrderDeliveredPatch(orders, null)).toBe(orders);
  });

  test('buildBeanOrderDeliveredNotifyInput uses order snapshot without extra fetches', () => {
    const input = buildBeanOrderDeliveredNotifyInput(
      {
        id: 'order-1',
        orderNo: 'BO-20260722-003',
        recipientName: 'ทัพพ์เทพ',
        recipientAddress: '123 ต.คึกคัก อ.เมืองพังงา',
        recipientProvince: 'พังงา',
        recipientPostalCode: '82000',
        customerName: null,
      },
      'KEX123',
      'kerryexpress-th',
      'th',
    );

    expect(input.orderId).toBe('order-1');
    expect(input.trackingNumber).toBe('KEX123');
    expect(input.customerName).toBe('ทัพพ์เทพ');
    expect(input.destination?.province).toBe('พังงา');
  });
});
