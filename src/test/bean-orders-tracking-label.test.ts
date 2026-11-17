import { describe, expect, test } from 'vitest';
import { formatShipmentTrackingLabel } from '@/lib/bean-orders/tracking-status-labels';

describe('formatShipmentTrackingLabel', () => {
  test('no longer shows delivered tracking status label', () => {
    expect(formatShipmentTrackingLabel('delivered')).toBe(null);
  });

  test('shows shipped when parcel sent with tracking number', () => {
    expect(
      formatShipmentTrackingLabel(null, {
        fulfillmentStatus: 'shipped',
        trackingNumber: 'KEX123',
      }),
    ).toBe('จัดส่งแล้ว');
  });

  test('pending with tracking counts as shipped for display', () => {
    expect(
      formatShipmentTrackingLabel(null, {
        fulfillmentStatus: 'pending',
        trackingNumber: 'KEX123',
      }),
    ).toBe('จัดส่งแล้ว');
  });

  test('shows same-day label without tracking number', () => {
    expect(
      formatShipmentTrackingLabel(null, {
        fulfillmentStatus: 'shipped',
        trackingNumber: null,
      }),
    ).toBe('จัดส่งแล้ว (ไม่มีเลขพัสดุ)');
  });
});