import { describe, expect, test, vi, beforeEach } from 'vitest';

const fetchTavilyMock = vi.fn();
vi.mock('@/lib/external/tavily-client', () => ({
  fetchTavily: (...args: unknown[]) => fetchTavilyMock(...args),
}));

import { fetchMarketTrends, __clearTrendsCache } from '@/app/actions/market-insights-fetch';

describe('fetchMarketTrends', () => {
  beforeEach(() => {
    fetchTavilyMock.mockReset();
    __clearTrendsCache();
  });

  test('aggregates + de-duplicates sources across queries', async () => {
    fetchTavilyMock.mockResolvedValue([
      { title: 'Trend A', content: 'matcha is rising in cafes everywhere', url: 'https://a.com' },
      { title: 'Trend Dup', content: 'dup', url: 'https://dup.com' },
    ]);

    const { sources, raw } = await fetchMarketTrends();

    // 3 queries each return the same 2 urls -> deduped to 2 unique
    expect(sources).toHaveLength(2);
    expect(sources.map((s) => s.url).sort()).toEqual(['https://a.com', 'https://dup.com']);
    expect(raw).toContain('Trend A');
  });

  test('passes advanced search options for market-insights user', async () => {
    fetchTavilyMock.mockResolvedValue([{ title: 'T', content: 'c', url: 'https://t.com' }]);

    await fetchMarketTrends();

    const [, options] = fetchTavilyMock.mock.calls[0];
    expect(options).toMatchObject({
      userId: 'market-insights-service',
      searchDepth: 'advanced',
      maxResults: 4,
    });
  });

  test('survives a failing query (Promise.allSettled) and returns N/A raw when empty', async () => {
    fetchTavilyMock.mockRejectedValue(new Error('rate limited'));

    const { sources, raw } = await fetchMarketTrends();

    expect(sources).toEqual([]);
    expect(raw).toBe('N/A');
  });

  test('caches results so a second call does not hit Tavily again', async () => {
    fetchTavilyMock.mockResolvedValue([{ title: 'T', content: 'c', url: 'https://t.com' }]);

    await fetchMarketTrends();
    const callsAfterFirst = fetchTavilyMock.mock.calls.length;
    await fetchMarketTrends();

    expect(fetchTavilyMock.mock.calls.length).toBe(callsAfterFirst);
  });
});
