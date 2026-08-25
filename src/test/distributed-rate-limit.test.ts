import { beforeEach, describe, expect, it } from 'vitest';
import { createRateLimiter } from '@/lib/rate-limit/create-rate-limiter';

describe('createRateLimiter', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('uses in-memory fallback when Upstash is not configured', async () => {
    const limiter = createRateLimiter({
      prefix: 'test',
      maxRequests: 2,
      windowMs: 60_000,
    });

    expect((await limiter.check('user-a')).allowed).toBe(true);
    expect((await limiter.check('user-a')).allowed).toBe(true);
    expect((await limiter.check('user-a')).allowed).toBe(false);
  });

  it('tracks keys independently in memory mode', async () => {
    const limiter = createRateLimiter({
      prefix: 'test',
      maxRequests: 1,
      windowMs: 60_000,
    });

    expect((await limiter.check('user-a')).allowed).toBe(true);
    expect((await limiter.check('user-b')).allowed).toBe(true);
    expect((await limiter.check('user-a')).allowed).toBe(false);
  });

  it('clears attempts in memory mode', async () => {
    const limiter = createRateLimiter({
      prefix: 'test',
      maxRequests: 1,
      windowMs: 60_000,
    });

    expect((await limiter.check('user-a')).allowed).toBe(true);
    expect((await limiter.check('user-a')).allowed).toBe(false);
    await limiter.clear('user-a');
    expect((await limiter.peek('user-a')).allowed).toBe(true);
  });
});
