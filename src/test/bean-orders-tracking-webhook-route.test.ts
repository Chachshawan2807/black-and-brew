import { describe, expect, test, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('next/cache', () => ({
  unstable_noStore: vi.fn(),
}));

const applyTrackingUpdateMock = vi.fn();
const maybeNotifyMock = vi.fn();

vi.mock('@/lib/bean-orders/tracking-webhook', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/bean-orders/tracking-webhook')>();
  return {
    ...actual,
    isTrackingWebhookVerification: actual.isTrackingWebhookVerification,
    parseTrackingWebhookEvents: actual.parseTrackingWebhookEvents,
  };
});

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(),
}));

describe('POST /api/bean-orders/tracking-webhook', () => {
  beforeEach(() => {
    vi.resetModules();
    applyTrackingUpdateMock.mockReset();
    maybeNotifyMock.mockReset();
    process.env.TRACKING_WEBHOOK_SECRET = 'test-tracking-secret';
  });

  test('rejects missing authorization', async () => {
    const { POST } = await import('@/app/api/bean-orders/tracking-webhook/route');
    const res = await POST(
      new Request('http://localhost/api/bean-orders/tracking-webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'verify' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  test('rejects wrong secret', async () => {
    const { POST } = await import('@/app/api/bean-orders/tracking-webhook/route');
    const res = await POST(
      new Request('http://localhost/api/bean-orders/tracking-webhook', {
        method: 'POST',
        headers: {
          authorization: 'Bearer wrong',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ event: 'verify' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  test('allows verification handshake with valid secret', async () => {
    const { POST } = await import('@/app/api/bean-orders/tracking-webhook/route');
    const res = await POST(
      new Request('http://localhost/api/bean-orders/tracking-webhook', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-tracking-secret',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ event: 'verify' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
