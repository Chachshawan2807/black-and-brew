import { describe, expect, test } from 'vitest';
import {
  isTrackingWebhookVerification,
  parseTrackingWebhookEvents,
} from '@/lib/bean-orders/tracking-webhook';

describe('parseTrackingWebhookEvents', () => {
  test('parses nested data object', () => {
    const events = parseTrackingWebhookEvents({
      data: {
        tracking_number: 'TH123',
        courier_code: 'kerry-logistics',
        delivery_status: 'transit',
      },
    });

    expect(events).toEqual([
      {
        trackingNumber: 'TH123',
        carrierCode: 'kerry-logistics',
        status: 'transit',
      },
    ]);
  });

  test('parses batch data array', () => {
    const events = parseTrackingWebhookEvents({
      data: [
        {
          tracking_number: 'A1',
          courier_code: 'flash-express',
          status: 'delivered',
        },
        {
          tracking_number: 'B2',
          courier_code: 'thailand-post',
          delivery_status: 'pickup',
        },
      ],
    });

    expect(events).toHaveLength(2);
    expect(events[1]?.status).toBe('pickup');
  });

  test('parses flat payload', () => {
    const events = parseTrackingWebhookEvents({
      trackingNumber: 'X9',
      carrierCode: 'jt-express',
      status: 'registered',
    });

    expect(events[0]?.trackingNumber).toBe('X9');
    expect(events[0]?.carrierCode).toBe('jt-express');
  });
});

describe('isTrackingWebhookVerification', () => {
  test('detects verify event', () => {
    expect(isTrackingWebhookVerification({ event: 'verify' })).toBe(true);
    expect(isTrackingWebhookVerification({ verify: true })).toBe(true);
    expect(isTrackingWebhookVerification({ type: 'VERIFY' })).toBe(true);
    expect(isTrackingWebhookVerification({ data: { tracking_number: '1' } })).toBe(false);
  });
});
