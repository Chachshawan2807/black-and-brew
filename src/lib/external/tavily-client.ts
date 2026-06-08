/**
 * Tavily HTTP client — shared across all callers in this process.
 *
 * Design decisions:
 *  - In-memory cache keyed by normalised query hash (TTL 3 600 s = 1 hour)
 *  - Sliding-window rate limiter: 10 requests/hour per userId
 *  - Cache is checked BEFORE rate limit, so duplicate queries never consume a slot
 */
import { createHash } from 'crypto';
import { SlidingWindowRateLimiter } from '@/lib/rate-limit/sliding-window';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface TavilyResult {
  title: string;
  content: string;
  url: string;
}

// ─── Singletons (module-level) ────────────────────────────────────────────────

const CACHE_TTL_MS = 3_600_000; // 1 hour

/** Normalised query hash → { results, expiresAt } */
const cache = new Map<string, { results: TavilyResult[]; expiresAt: number }>();

/** 10 requests / hour per userId (fallback key: 'anonymous') */
const rateLimiter = new SlidingWindowRateLimiter(10, 3_600_000);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normaliseQuery(query: string): string {
  return query.toLowerCase().trim();
}

function hashQuery(query: string): string {
  return createHash('sha256').update(normaliseQuery(query)).digest('hex');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch search results from Tavily.
 *
 * @throws when TAVILY_API_KEY is absent
 * @throws when the per-user rate limit is exceeded
 * @throws when Tavily returns a non-OK response
 */
export async function fetchTavily(
  query: string,
  options?: { userId?: string }
): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('[TAVILY] Missing TAVILY_API_KEY environment variable');
  }

  // ── 1. Cache lookup (before rate-limit, so hits are free) ─────────────────
  const cacheKey = hashQuery(query);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  // ── 2. Rate-limit check ────────────────────────────────────────────────────
  const userId = options?.userId ?? 'anonymous';
  const { allowed, remaining, resetAt } = rateLimiter.check(userId);

  if (!allowed) {
    const resetInMin = Math.ceil((resetAt - Date.now()) / 60_000);
    throw new Error(
      `[TAVILY] Rate limit exceeded for user "${userId}". ` +
        `Limit: 10 requests/hour. Resets in ~${resetInMin} minute(s).`
    );
  }

  void remaining; // available to callers if needed in the future

  // ── 3. Tavily API call ─────────────────────────────────────────────────────
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 3,
    }),
  });

  if (!response.ok) {
    throw new Error(`[TAVILY] Search failed: ${response.statusText}`);
  }

  const data = (await response.json()) as { results?: Array<Record<string, string>> };

  const results: TavilyResult[] = (data.results ?? []).map((r) => ({
    title: r.title ?? '',
    content: r.content ?? '',
    url: r.url ?? '',
  }));

  // ── 4. Populate cache ──────────────────────────────────────────────────────
  cache.set(cacheKey, { results, expiresAt: Date.now() + CACHE_TTL_MS });

  return results;
}
