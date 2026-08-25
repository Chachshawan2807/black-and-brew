import { describe, expect, test, vi, beforeAll } from 'vitest';
import {
  computeTrackingMoreWebhookSignature,
} from '@/lib/bean-orders/tracking-webhook-auth';

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('next/cache', () => ({
  unstable_noStore: vi.fn(),
}));

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(),
}));

const SECRET = 'test-tracking-secret';

function signedHeaders(timestamp: string): HeadersInit {
  return {
    timestamp,
    signature: computeTrackingMoreWebhookSignature(SECRET, timestamp),
    'content-type': 'application/json',
  };
}

describe('POST /api/bean-orders/tracking-webhook', () => {
  let POST: typeof import('@/app/api/bean-orders/tracking-webhook/route').POST;

  beforeAll(async () => {
    process.env.TRACKING_WEBHOOK_SECRET = SECRET;
    ({ POST } = await import('@/app/api/bean-orders/tracking-webhook/route'));
  });

  test('rejects missing signature headers', async () => {
    const res = await POST(
      new Request('http://localhost/api/bean-orders/tracking-webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'verify' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  test('rejects wrong signature', async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const res = await POST(
      new Request('http://localhost/api/bean-orders/tracking-webhook', {
        method: 'POST',
        headers: {
          timestamp,
          signature: 'deadbeef',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ event: 'verify' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  test('allows verification handshake with valid TrackingMore signature', async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const res = await POST(
      new Request('http://localhost/api/bean-orders/tracking-webhook', {
        method: 'POST',
        headers: signedHeaders(timestamp),
        body: JSON.stringify({ event: 'verify' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
