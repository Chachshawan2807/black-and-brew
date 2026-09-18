import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  classifyDosPath,
  createDosGuard,
  isDosProbePath,
  isOversizedDosBody,
} from '@/lib/rate-limit/dos-guard';

function req(path: string, init?: { method?: string; headers?: Record<string, string> }) {
  return new NextRequest(`https://example.com${path}`, {
    method: init?.method ?? 'GET',
    headers: init?.headers,
  });
}

describe('isDosProbePath', () => {
  it('blocks scanner and secret-file probes without touching ERP routes', () => {
    expect(isDosProbePath('/.env')).toBe(true);
    expect(isDosProbePath('/.git/config')).toBe(true);
    expect(isDosProbePath('/wp-admin/setup')).toBe(true);
    expect(isDosProbePath('/phpmyadmin')).toBe(true);
    expect(isDosProbePath('/th/inventory')).toBe(false);
    expect(isDosProbePath('/api/home/refresh')).toBe(false);
  });
});

describe('classifyDosPath', () => {
  it('treats cron-like APIs as expensive and write APIs as mutations', () => {
    expect(classifyDosPath('/api/daily-report', 'GET')).toBe('expensive');
    expect(classifyDosPath('/api/insight-alerts', 'GET')).toBe('expensive');
    expect(classifyDosPath('/api/inventory/offline-mutation', 'POST')).toBe('mutation');
    expect(classifyDosPath('/api/push/register', 'GET')).toBe('api');
    expect(classifyDosPath('/th/home', 'GET')).toBe('page');
  });
});

describe('isOversizedDosBody', () => {
  it('rejects invalid or oversized Content-Length without requiring extra env', () => {
    expect(isOversizedDosBody('100', 1024)).toBe(false);
    expect(isOversizedDosBody('2048', 1024)).toBe(true);
    expect(isOversizedDosBody('-1', 1024)).toBe(true);
    expect(isOversizedDosBody('nope', 1024)).toBe(true);
    expect(isOversizedDosBody(null, 1024)).toBe(false);
  });
});

describe('createDosGuard', () => {
  const previousCronSecret = process.env.CRON_SECRET;
  const previousWebhookSecret = process.env.PUSH_WEBHOOK_SECRET;
  const previousUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    if (previousCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousCronSecret;
    if (previousWebhookSecret === undefined) delete process.env.PUSH_WEBHOOK_SECRET;
    else process.env.PUSH_WEBHOOK_SECRET = previousWebhookSecret;
    if (previousUpstashUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousUpstashUrl;
    if (previousUpstashToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousUpstashToken;
  });

  it('returns 404 for probe paths without consuming the page budget', async () => {
    const guard = createDosGuard({
      burst: { maxRequests: 1, windowMs: 60_000 },
      page: { maxRequests: 1, windowMs: 60_000 },
    });

    const blocked = await guard.inspect(req('/.env'));
    expect(blocked?.status).toBe(404);

    const page = await guard.inspect(
      req('/th/home', { headers: { 'x-vercel-forwarded-for': '203.0.113.1' } }),
    );
    expect(page).toBeNull();
  });

  it('returns 413 for oversized bodies', async () => {
    const guard = createDosGuard({ maxBodyBytes: 1024 });
    const blocked = await guard.inspect(
      req('/th/home', {
        method: 'POST',
        headers: {
          'content-length': '2048',
          'x-vercel-forwarded-for': '203.0.113.2',
        },
      }),
    );
    expect(blocked?.status).toBe(413);
  });

  it('returns 429 with Retry-After when an IP exceeds the burst window', async () => {
    const guard = createDosGuard({
      burst: { maxRequests: 2, windowMs: 60_000 },
      page: { maxRequests: 100, windowMs: 60_000 },
    });
    const headers = { 'x-vercel-forwarded-for': '203.0.113.9' };

    expect(await guard.inspect(req('/th/home', { headers }))).toBeNull();
    expect(await guard.inspect(req('/th/home', { headers }))).toBeNull();

    const blocked = await guard.inspect(req('/th/home', { headers }));
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get('Retry-After')).toBeTruthy();
  });

  it('does not rate-limit trusted cron or webhook bearers', async () => {
    process.env.CRON_SECRET = 'cron-test-secret';
    const guard = createDosGuard({
      burst: { maxRequests: 1, windowMs: 60_000 },
      expensive: { maxRequests: 1, windowMs: 60_000 },
    });
    const headers = {
      authorization: 'Bearer cron-test-secret',
      'x-vercel-forwarded-for': '203.0.113.50',
    };

    expect(await guard.inspect(req('/api/daily-report', { headers }))).toBeNull();
    expect(await guard.inspect(req('/api/daily-report', { headers }))).toBeNull();
  });
});
