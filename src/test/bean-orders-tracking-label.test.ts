import { describe, expect, test } from 'vitest';
import { formatShipmentTrackingLabel } from '@/lib/bean-orders/tracking-status-labels';

describe('formatShipmentTrackingLabel', () => {
  test('shows delivered when staff confirmed delivery', () => {
    expect(formatShipmentTrackingLabel('delivered')).toBe('จัดส่งสำเร็จ');
  });

  test('shows shipped when parcel sent with tracking number', () => {
    expect(
      formatShipmentTrackingLabel(null, {
        fulfillmentStatus: 'shipped',
        trackingNumber: 'KEX123',
      }),
    ).toBe('ส่งแล้ว');
  });

  test('shows same-day label without tracking number', () => {
    expect(
      formatShipmentTrackingLabel(null, {
        fulfillmentStatus: 'shipped',
        trackingNumber: null,
      }),
    ).toBe('ส่งแล้ว (ไม่มีเลขพัสดุ)');
  });
});
