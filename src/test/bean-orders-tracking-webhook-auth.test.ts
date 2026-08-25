import { describe, expect, test } from 'vitest';
import {
  computeTrackingMoreWebhookSignature,
  extractTrackingMoreWebhookCredentials,
  verifyTrackingMoreWebhookRequest,
  verifyTrackingMoreWebhookSignature,
} from '@/lib/bean-orders/tracking-webhook-auth';

const SECRET = 'hsv9faxl-r9da-4kn8-7plv-vynh6g5qpb95';
const TIMESTAMP = '1662371528';
const SIGNATURE = computeTrackingMoreWebhookSignature(SECRET, TIMESTAMP);

describe('computeTrackingMoreWebhookSignature', () => {
  test('matches TrackingMore V4 golang example digest', () => {
    expect(
      computeTrackingMoreWebhookSignature('2e55b9a3-4dd1-4416-9897-c4bd1e3d738f', '1662371528'),
    ).toBe('a37084ab68ae16b77db1f8463f31be9fcc965e2515e03efecf8139bb1e511b06');
  });
});

describe('verifyTrackingMoreWebhookSignature', () => {
  test('accepts valid hex signature', () => {
    expect(
      verifyTrackingMoreWebhookSignature({
        secret: SECRET,
        timestamp: TIMESTAMP,
        signature: SIGNATURE,
      }),
    ).toBe(true);
  });

  test('rejects wrong signature', () => {
    expect(
      verifyTrackingMoreWebhookSignature({
        secret: SECRET,
        timestamp: TIMESTAMP,
        signature: 'deadbeef',
      }),
    ).toBe(false);
  });
});

describe('extractTrackingMoreWebhookCredentials', () => {
  test('reads signature and timestamp headers', () => {
    const headers = new Headers({
      timestamp: TIMESTAMP,
      signature: SIGNATURE,
    });

    expect(extractTrackingMoreWebhookCredentials(headers, {})).toEqual({
      timestamp: TIMESTAMP,
      signature: SIGNATURE,
    });
  });

  test('falls back to verify block in payload', () => {
    expect(
      extractTrackingMoreWebhookCredentials(
        new Headers(),
        {
          verify: {
            timestamp: 1625448575,
            signature: 'cc1ac9b350fa1e5e322c026de6d41f55f902c835ebcbcf495c4ecd18d04a3c54',
          },
        },
      ),
    ).toEqual({
      timestamp: '1625448575',
      signature: 'cc1ac9b350fa1e5e322c026de6d41f55f902c835ebcbcf495c4ecd18d04a3c54',
    });
  });
});

describe('verifyTrackingMoreWebhookRequest', () => {
  test('rejects when secret is missing', () => {
    expect(
      verifyTrackingMoreWebhookRequest({
        secret: null,
        headers: new Headers({ timestamp: TIMESTAMP, signature: SIGNATURE }),
        payload: {},
      }),
    ).toEqual({ ok: false, reason: 'missing_secret' });
  });

  test('accepts signed header request', () => {
    expect(
      verifyTrackingMoreWebhookRequest({
        secret: SECRET,
        headers: new Headers({ timestamp: TIMESTAMP, signature: SIGNATURE }),
        payload: {},
        nowSeconds: Number(TIMESTAMP),
      }),
    ).toEqual({ ok: true });
  });
});
