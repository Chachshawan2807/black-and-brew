import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlidingWindowRateLimiter } from '@/lib/rate-limit/sliding-window';

describe('SlidingWindowRateLimiter', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('allows the first request', () => {
    const limiter = new SlidingWindowRateLimiter(5, 60_000);
    const result = limiter.check('user1');
    expect(result.allowed).toBe(true);
  });

  it('allows requests up to the max limit', () => {
    const limiter = new SlidingWindowRateLimiter(3, 60_000);
    expect(limiter.check('user1').allowed).toBe(true);
    expect(limiter.check('user1').allowed).toBe(true);
    expect(limiter.check('user1').allowed).toBe(true);
  });

  it('blocks the (max+1)th request', () => {
    const limiter = new SlidingWindowRateLimiter(2, 60_000);
    limiter.check('user1');
    limiter.check('user1');
    const result = limiter.check('user1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('decrements remaining count correctly', () => {
    const limiter = new SlidingWindowRateLimiter(5, 60_000);
    expect(limiter.check('user1').remaining).toBe(4);
    expect(limiter.check('user1').remaining).toBe(3);
    expect(limiter.check('user1').remaining).toBe(2);
  });

  it('tracks different keys independently', () => {
    const limiter = new SlidingWindowRateLimiter(1, 60_000);
    expect(limiter.check('user-a').allowed).toBe(true);
    expect(limiter.check('user-b').allowed).toBe(true);
    expect(limiter.check('user-a').allowed).toBe(false);
    expect(limiter.check('user-b').allowed).toBe(false);
  });

  it('returns resetAt as a future timestamp', () => {
    const limiter = new SlidingWindowRateLimiter(1, 60_000);
    const before = Date.now();
    const result = limiter.check('user1');
    expect(result.resetAt).toBeGreaterThan(before);
  });

  it('allows requests again after the window slides', () => {
    vi.useFakeTimers();
    const windowMs = 1000;
    const limiter = new SlidingWindowRateLimiter(2, windowMs);

    limiter.check('slide-user');
    limiter.check('slide-user');
    expect(limiter.check('slide-user').allowed).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(windowMs + 1);

    expect(limiter.check('slide-user').allowed).toBe(true);
    vi.useRealTimers();
  });

  it('peek reports blocked without recording a new attempt', () => {
    const limiter = new SlidingWindowRateLimiter(2, 60_000);
    limiter.check('peek-user');
    limiter.check('peek-user');

    const peekBefore = limiter.peek('peek-user');
    expect(peekBefore.allowed).toBe(false);

    const peekAfter = limiter.peek('peek-user');
    expect(peekAfter.allowed).toBe(false);
    expect(peekAfter.remaining).toBe(0);
  });

  it('clear resets the window for a key', () => {
    const limiter = new SlidingWindowRateLimiter(1, 60_000);
    limiter.check('clear-user');
    expect(limiter.peek('clear-user').allowed).toBe(false);

    limiter.clear('clear-user');
    expect(limiter.peek('clear-user').allowed).toBe(true);
  });

  it('does not add a timestamp when rate limit is exceeded', () => {
    const limiter = new SlidingWindowRateLimiter(2, 60_000);
    limiter.check('counter-user');
    limiter.check('counter-user');
    limiter.check('counter-user');
    limiter.check('counter-user');
    limiter.check('counter-user');

    vi.useFakeTimers();
    vi.advanceTimersByTime(60_001);
    const result = limiter.check('counter-user');
    expect(result.allowed).toBe(true);
    vi.useRealTimers();
  });
});
