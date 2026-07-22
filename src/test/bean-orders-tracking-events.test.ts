import { describe, expect, test } from 'vitest';
import {
  formatLatestTrackingLabel,
  formatTrackingLocationParts,
  parseTrackingEvents,
  parseTrackingLocation,
} from '@/lib/bean-orders/tracking-events';

const kerrySample = {
  origin_info: {
    trackinfo: [
      {
        checkpoint_date: '2026-07-22T16:28:10',
        checkpoint_delivery_status: 'delivered',
        tracking_detail: 'Successfully delivered',
        location: 'Wang Chan, Rayong',
      },
      {
        checkpoint_date: '2026-07-22T09:11:19',
        checkpoint_delivery_status: 'pickup',
        tracking_detail: 'Out for delivery',
        location: 'Wang Chan, Rayong',
      },
      {
        checkpoint_date: '2026-07-21T16:03:36',
        checkpoint_delivery_status: 'transit',
        tracking_detail: 'Sender dropped off at branch',
        location: 'Lam Luk Ka, Pathumthani',
      },
    ],
  },
};

describe('parseTrackingLocation', () => {
  test('splits district and province from comma-separated location', () => {
    expect(parseTrackingLocation('Wang Chan, Rayong')).toEqual({
      subdistrict: null,
      district: 'Wang Chan',
      province: 'Rayong',
      locationLine: 'Wang Chan, Rayong',
    });
  });

  test('splits tambon district province when three parts exist', () => {
    expect(parseTrackingLocation('บ้านใหม่, เมือง, ระยอง')).toEqual({
      subdistrict: 'บ้านใหม่',
      district: 'เมือง',
      province: 'ระยอง',
      locationLine: 'บ้านใหม่, เมือง, ระยอง',
    });
  });
});

describe('parseTrackingEvents', () => {
  test('parses Kerry trackinfo newest first', () => {
    const events = parseTrackingEvents(kerrySample);
    expect(events).toHaveLength(3);
    expect(events[0]?.statusLabel).toBe('จัดส่งสำเร็จ');
    expect(events[0]?.detail).toBe('จัดส่งสำเร็จ');
    expect(events[0]?.district).toBe('วังจันทร์');
    expect(events[0]?.province).toBe('ระยอง');
    expect(events[2]?.district).toBe('ลำลูกกา');
    expect(events[2]?.province).toBe('ปทุมธานี');
  });

  test('unwraps API envelope data object', () => {
    const events = parseTrackingEvents({ data: kerrySample });
    expect(events.length).toBeGreaterThan(0);
  });
});

describe('formatLatestTrackingLabel', () => {
  test('returns latest Thai detail for shipped orders', () => {
    expect(
      formatLatestTrackingLabel(kerrySample, 'delivered', {
        fulfillmentStatus: 'shipped',
        trackingNumber: 'KEX123',
      }),
    ).toBe('จัดส่งสำเร็จ');
  });

  test('returns null for pending orders', () => {
    expect(
      formatLatestTrackingLabel(kerrySample, 'delivered', {
        fulfillmentStatus: 'pending',
      }),
    ).toBeNull();
  });
});

describe('formatTrackingLocationParts', () => {
  test('formats resolved Thai admin labels without abbreviations', () => {
    const events = parseTrackingEvents(kerrySample);
    expect(formatTrackingLocationParts(events[0]!)).toBe('อ.วังจันทร์ จ.ระยอง');
    expect(formatTrackingLocationParts(events[2]!)).toBe('อ.ลำลูกกา จ.ปทุมธานี');
  });
});
