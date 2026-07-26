import {
  fetchTransactionHistory,
  type InventoryTransactionFilterType,
} from '@/app/actions/inventory-actions';

type PrefetchResult = Awaited<ReturnType<typeof fetchTransactionHistory>>;

export type HistoryCacheKeyInput = {
  type?: InventoryTransactionFilterType;
  searchQuery?: string;
};

export type HistoryPageCacheEntry = {
  data: NonNullable<PrefetchResult['data']>;
  hasMore: boolean;
  savedAt: number;
};

/** Fresh window: skip network when entry is younger than this. */
export const HISTORY_PAGE_FRESH_TTL_MS = 30_000;

const pageCache = new Map<string, HistoryPageCacheEntry>();
const inFlight = new Map<string, Promise<PrefetchResult>>();

export function historyCacheKey(input: HistoryCacheKeyInput = {}): string {
  const type = input.type ?? 'ALL';
  const searchQuery = (input.searchQuery ?? '').trim().toLowerCase();
  return `${type}|${searchQuery}`;
}

export function getHistoryPageCache(
  input: HistoryCacheKeyInput = {},
): HistoryPageCacheEntry | null {
  return pageCache.get(historyCacheKey(input)) ?? null;
}

export function setHistoryPageCache(
  input: HistoryCacheKeyInput,
  page: { data: NonNullable<PrefetchResult['data']>; hasMore: boolean },
): void {
  pageCache.set(historyCacheKey(input), {
    data: page.data,
    hasMore: page.hasMore,
    savedAt: Date.now(),
  });
}

export function isHistoryPageCacheFresh(savedAt: number, now = Date.now()): boolean {
  return now - savedAt < HISTORY_PAGE_FRESH_TTL_MS;
}

export function isInventoryHistoryPrefetchFresh(): boolean {
  const entry = getHistoryPageCache({ type: 'ALL', searchQuery: '' });
  if (!entry) return false;
  return isHistoryPageCacheFresh(entry.savedAt);
}

export function invalidateInventoryHistoryPrefetch(): void {
  pageCache.clear();
  inFlight.clear();
}

function storeSuccessfulResult(input: HistoryCacheKeyInput, result: PrefetchResult): void {
  if (result.success && result.data) {
    setHistoryPageCache(input, {
      data: result.data,
      hasMore: Boolean(result.hasMore),
    });
  }
}

export function prefetchInventoryHistoryPage(
  input: HistoryCacheKeyInput = {},
): Promise<PrefetchResult> {
  const key = historyCacheKey(input);
  const type = input.type ?? 'ALL';
  const searchQuery = (input.searchQuery ?? '').trim();

  const cached = pageCache.get(key);
  if (cached && isHistoryPageCacheFresh(cached.savedAt)) {
    return Promise.resolve({
      success: true,
      data: cached.data,
      hasMore: cached.hasMore,
    });
  }

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = fetchTransactionHistory({
    type,
    itemNameQuery: searchQuery || undefined,
    offset: 0,
    limit: 50,
  })
    .then((result) => {
      storeSuccessfulResult({ type, searchQuery }, result);
      return result;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

export function prefetchInventoryHistoryFirstPage() {
  return prefetchInventoryHistoryPage({ type: 'ALL', searchQuery: '' });
}

/** @deprecated Prefer getHistoryPageCache + prefetch; kept for transitional callers. */
export async function consumeInventoryHistoryPrefetch(): Promise<PrefetchResult | null> {
  const cached = getHistoryPageCache({ type: 'ALL', searchQuery: '' });
  if (cached) {
    return {
      success: true,
      data: cached.data,
      hasMore: cached.hasMore,
    };
  }

  const inflightAll = inFlight.get(historyCacheKey({ type: 'ALL', searchQuery: '' }));
  if (!inflightAll) return null;

  try {
    return await inflightAll;
  } catch {
    return null;
  }
}

const FILTER_WARM_TYPES: InventoryTransactionFilterType[] = ['IN', 'OUT', 'ADJUST'];

/** Warm type-filter first pages after ALL is available (idle-friendly). */
export function warmInventoryHistoryFilterPages(): void {
  for (const type of FILTER_WARM_TYPES) {
    void prefetchInventoryHistoryPage({ type, searchQuery: '' });
  }
}
