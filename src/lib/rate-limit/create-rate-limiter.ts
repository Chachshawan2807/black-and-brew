import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { SlidingWindowRateLimiter } from '@/lib/rate-limit/sliding-window';

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export interface DistributedRateLimiter {
  check(key: string): Promise<RateLimitResult>;
  peek(key: string): Promise<RateLimitResult>;
  clear(key: string): Promise<void>;
}

type Duration = `${number} s` | `${number} m` | `${number} h` | `${number} d`;

function formatWindow(windowMs: number): Duration {
  if (windowMs % 86_400_000 === 0) return `${windowMs / 86_400_000} d`;
  if (windowMs % 3_600_000 === 0) return `${windowMs / 3_600_000} h`;
  if (windowMs % 60_000 === 0) return `${windowMs / 60_000} m`;
  return `${Math.max(1, Math.ceil(windowMs / 1000))} s`;
}

function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

function createMemoryRateLimiter(
  maxRequests: number,
  windowMs: number,
): DistributedRateLimiter {
  const memory = new SlidingWindowRateLimiter(maxRequests, windowMs);

  return {
    check: async (key) => memory.check(key),
    peek: async (key) => memory.peek(key),
    clear: async (key) => {
      memory.clear(key);
    },
  };
}

function createUpstashRateLimiter(options: {
  prefix: string;
  maxRequests: number;
  windowMs: number;
}): DistributedRateLimiter {
  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(
      options.maxRequests,
      formatWindow(options.windowMs),
    ),
    prefix: `bb:rl:${options.prefix}`,
    analytics: true,
  });

  return {
    check: async (key) => {
      const result = await ratelimit.limit(key);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    },
    peek: async (key) => {
      const result = await ratelimit.getRemaining(key);
      return {
        allowed: result.remaining > 0,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    },
    clear: async (key) => {
      await ratelimit.resetUsedTokens(key);
    },
  };
}

/**
 * Sliding-window rate limiter with Upstash Redis when configured,
 * otherwise falls back to per-instance in-memory storage.
 */
export function createRateLimiter(options: {
  prefix: string;
  maxRequests: number;
  windowMs: number;
}): DistributedRateLimiter {
  if (isUpstashConfigured()) {
    return createUpstashRateLimiter(options);
  }

  return createMemoryRateLimiter(options.maxRequests, options.windowMs);
}

export function isDistributedRateLimitEnabled(): boolean {
  return isUpstashConfigured();
}
