/**
 * Sliding-window rate limiter — pure in-memory, no Redis dependency.
 *
 * Each call to `check(key)` atomically inspects + (if allowed) records a
 * timestamp.  Blocked calls do NOT consume a slot.
 */
export class SlidingWindowRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  /** key → sorted list of request timestamps (epoch ms) within the window */
  private readonly store = new Map<string, number[]>();

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Evict timestamps older than the current window
    const timestamps = (this.store.get(key) ?? []).filter((t) => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      // Oldest timestamp in the window is when the first slot will free up
      const resetAt = timestamps[0] + this.windowMs;
      return { allowed: false, remaining: 0, resetAt };
    }

    // Record this request
    timestamps.push(now);
    this.store.set(key, timestamps);

    return {
      allowed: true,
      remaining: this.maxRequests - timestamps.length,
      resetAt: timestamps[0] + this.windowMs,
    };
  }
}
