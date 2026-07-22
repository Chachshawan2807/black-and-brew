import { fetchTransactionHistory } from '@/app/actions/inventory-actions';

type PrefetchResult = Awaited<ReturnType<typeof fetchTransactionHistory>>;

const PREFETCH_MAX_AGE_MS = 10_000;

let prefetchPromise: Promise<PrefetchResult> | null = null;
let prefetchStartedAt = 0;
let lastPrefetchSuccessAt = 0;

function markPrefetchSuccess() {
  lastPrefetchSuccessAt = Date.now();
}

export function isInventoryHistoryPrefetchFresh() {
  return lastPrefetchSuccessAt > 0 && Date.now() - lastPrefetchSuccessAt < PREFETCH_MAX_AGE_MS;
}

export function prefetchInventoryHistoryFirstPage() {
  const now = Date.now();
  if (prefetchPromise && now - prefetchStartedAt < PREFETCH_MAX_AGE_MS) {
    return prefetchPromise;
  }

  prefetchStartedAt = now;
  prefetchPromise = fetchTransactionHistory({ offset: 0, limit: 50, type: 'ALL' }).then((result) => {
    if (result.success) {
      markPrefetchSuccess();
    }
    return result;
  });
  return prefetchPromise;
}

export async function consumeInventoryHistoryPrefetch(): Promise<PrefetchResult | null> {
  if (!prefetchPromise) return null;

  const promise = prefetchPromise;
  prefetchPromise = null;

  try {
    return await promise;
  } catch {
    return null;
  }
}

export function invalidateInventoryHistoryPrefetch() {
  prefetchPromise = null;
  lastPrefetchSuccessAt = 0;
}
