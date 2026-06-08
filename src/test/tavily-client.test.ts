import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── mock fetch globally BEFORE importing the module under test ───────────────
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Dynamic import lets us reload the module between describe blocks when needed
// but for isolated userId/query keys we can share the singleton safely.
import { fetchTavily } from '@/lib/external/tavily-client';

// Helpers
const okResponse = (results: object[]) =>
  Promise.resolve({ ok: true, json: async () => ({ results }) } as Response);

const tavilyResult = (n: number) => ({
  title: `Result ${n}`,
  content: `Content ${n}`,
  url: `https://example.com/${n}`,
});

describe('fetchTavily', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TAVILY_API_KEY = 'test-key-xyz';
  });

  // ── basic happy path ──────────────────────────────────────────────────────
  it('returns mapped results from the Tavily API', async () => {
    mockFetch.mockReturnValueOnce(okResponse([tavilyResult(1), tavilyResult(2)]));

    const results = await fetchTavily('happy-path-query-abc', { userId: 'hp-user' });

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ title: 'Result 1', url: 'https://example.com/1' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('posts to https://api.tavily.com/search with correct payload', async () => {
    mockFetch.mockReturnValueOnce(okResponse([]));

    await fetchTavily('my search query', { userId: 'payload-user' });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.tavily.com/search');
    const body = JSON.parse(init.body as string);
    expect(body.query).toBe('my search query');
    expect(body.api_key).toBe('test-key-xyz');
  });

  // ── caching ───────────────────────────────────────────────────────────────
  it('returns cached results on duplicate queries (fetch called only once)', async () => {
    mockFetch.mockReturnValue(okResponse([tavilyResult(99)]));

    await fetchTavily('cache-test-query-unique-001', { userId: 'cache-user-001' });
    const second = await fetchTavily('cache-test-query-unique-001', { userId: 'cache-user-002' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(second[0].title).toBe('Result 99');
  });

  it('normalises query before cache lookup (trims + lowercases)', async () => {
    mockFetch.mockReturnValue(okResponse([tavilyResult(42)]));

    await fetchTavily('  Normalise Me  ', { userId: 'norm-user-a' });
    await fetchTavily('normalise me', { userId: 'norm-user-b' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // ── rate limiting ─────────────────────────────────────────────────────────
  it('throws a descriptive error when the per-user rate limit is exceeded', async () => {
    mockFetch.mockReturnValue(okResponse([]));

    // Exhaust the 10-per-hour limit for this isolated user key
    for (let i = 0; i < 10; i++) {
      await fetchTavily(`rate-test-unique-query-${i}`, { userId: 'rate-exceeded-user' });
    }

    await expect(
      fetchTavily('rate-test-over-limit-query', { userId: 'rate-exceeded-user' })
    ).rejects.toThrow(/rate limit exceeded/i);
  });

  it('rate limits are tracked independently per userId', async () => {
    mockFetch.mockReturnValue(okResponse([]));

    // Exhaust user A
    for (let i = 0; i < 10; i++) {
      await fetchTavily(`per-user-query-a-${i}`, { userId: 'per-user-a' });
    }

    // user B should still be allowed
    await expect(
      fetchTavily('per-user-query-b-0', { userId: 'per-user-b' })
    ).resolves.toBeDefined();
  });

  // ── error handling ────────────────────────────────────────────────────────
  it('throws when TAVILY_API_KEY is missing', async () => {
    delete process.env.TAVILY_API_KEY;

    await expect(
      fetchTavily('no-key-query', { userId: 'no-key-user' })
    ).rejects.toThrow(/TAVILY_API_KEY/i);
  });

  it('throws when the Tavily API returns a non-OK response', async () => {
    mockFetch.mockReturnValueOnce(
      Promise.resolve({ ok: false, statusText: 'Too Many Requests' } as Response)
    );

    await expect(
      fetchTavily('api-error-query-unique-xyz', { userId: 'api-error-user' })
    ).rejects.toThrow(/search failed/i);
  });
});
