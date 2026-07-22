import { describe, expect, test } from 'vitest';
import {
  formatShipmentTrackingLabel,
  mapTrackingStatusLabel,
} from '@/lib/bean-orders/trackingmore';

describe('mapTrackingStatusLabel', () => {
  test('maps common TrackingMore statuses', () => {
    expect(mapTrackingStatusLabel('registered')).toBe('ลงทะเบียนติดตามแล้ว');
    expect(mapTrackingStatusLabel('transit')).toBe('กำลังจัดส่ง');
    expect(mapTrackingStatusLabel('delivered')).toBe('จัดส่งสำเร็จ');
    expect(mapTrackingStatusLabel('pickup')).toBe('กำลังจัดส่ง');
  });
});

describe('formatShipmentTrackingLabel', () => {
  test('shows fallback when shipped with tracking but no status yet', () => {
    expect(
      formatShipmentTrackingLabel(null, {
        fulfillmentStatus: 'shipped',
        trackingNumber: 'TH999',
      }),
    ).toBe('รออัปเดตสถานะ');
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
