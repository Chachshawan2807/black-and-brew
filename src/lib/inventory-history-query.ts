import type { SupabaseClient } from '@supabase/supabase-js';
import { logSupabaseError, toUserFacingError } from '@/lib/user-facing-error';

export const HISTORY_PAGE_SIZE = 50;

const HISTORY_FETCH_FAIL = 'โหลดประวัติคลังไม่สำเร็จ กรุณาลองใหม่';

function historyFetchError(error: unknown): string {
  logSupabaseError('fetchTransactionHistory', error);
  return toUserFacingError(error, HISTORY_FETCH_FAIL);
}

export const HISTORY_ORDER_COLUMN = 'transaction_at' as const;

export const TRANSACTION_HISTORY_SELECT =
  'id, inventory_item_id, type, quantity, note, created_at, transaction_at, balance_after, inventory_items(name)';

export type InventoryTransactionType = 'IN' | 'OUT' | 'ADJUST' | 'ADD' | 'DELETE';
export type InventoryTransactionFilterType =
  | 'ALL'
  | Extract<InventoryTransactionType, 'IN' | 'OUT' | 'ADJUST'>;

/** Row shape used by history modal, cache, and realtime merge. */
export type InventoryHistoryDisplayRow = {
  id: string;
  created_at: string;
  transaction_at?: string | null;
  type: InventoryTransactionType;
  quantity: number;
  balance_after: number;
  inventory_items?: { name?: string } | null;
};

export type RawInventoryTransaction = {
  id: string;
  inventory_item_id: string | null;
  type: InventoryTransactionType;
  quantity: number;
  note: string | null;
  created_at: string;
  transaction_at?: string | null;
  balance_after: number;
  inventory_items?: { name?: string } | null;
};

export type FetchTransactionHistoryOptions = {
  itemId?: string;
  itemNameQuery?: string;
  limit?: number;
  offset: number;
  type?: InventoryTransactionFilterType;
};

export function sanitizeHistoryLimit(limit: number | undefined) {
  const parsed = Math.floor(Number(limit ?? HISTORY_PAGE_SIZE));
  if (!Number.isFinite(parsed)) return HISTORY_PAGE_SIZE;
  return Math.min(Math.max(parsed, 1), 100);
}

export function sanitizeHistoryOffset(offset: number | undefined) {
  const parsed = Math.floor(Number(offset ?? 0));
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(parsed, 0);
}

export function sanitizeHistorySearchQuery(query: string | undefined) {
  const trimmed = query?.trim() ?? '';
  if (!trimmed) return undefined;
  return trimmed.slice(0, 100);
}

export function historyRowSortTime(row: Pick<RawInventoryTransaction, 'transaction_at' | 'created_at'>) {
  return new Date(row.transaction_at ?? row.created_at).getTime();
}

export function enrichTransactionRows(transactions: RawInventoryTransaction[]) {
  return transactions.map((tx) => {
    const joinedName = tx.inventory_items?.name;
    const resolvedName =
      joinedName ||
      (tx.type === 'DELETE' && tx.note ? tx.note : null) ||
      (tx.type === 'ADD' && tx.note ? tx.note : null) ||
      'ไม่ทราบชื่อสินค้า';

    return {
      ...tx,
      inventory_items: {
        name: resolvedName,
      },
    };
  });
}

const NAME_SEARCH_MAX_ITEM_IDS = 80;

async function fetchTransactionHistoryByItemName(
  client: SupabaseClient,
  options: {
    itemNameQuery: string;
    type?: Exclude<InventoryTransactionFilterType, 'ALL'>;
    offset: number;
    safeLimit: number;
  },
): Promise<
  | { success: true; data: RawInventoryTransaction[]; hasMore: boolean }
  | { success: false; error: string }
> {
  const { itemNameQuery, type, offset, safeLimit } = options;
  const fetchCap = offset + safeLimit + 1;

  const { data: matchingItems, error: searchError } = await client
    .from('inventory_items')
    .select('id')
    .ilike('name', `%${itemNameQuery}%`)
    .limit(NAME_SEARCH_MAX_ITEM_IDS);

  if (searchError) {
    return { success: false, error: historyFetchError(searchError) };
  }

  const matchingIds = (matchingItems ?? []).map((item) => item.id);

  const buildQuery = (limit: number) => {
    let historyQuery = client
      .from('inventory_transactions')
      .select(TRANSACTION_HISTORY_SELECT)
      .order(HISTORY_ORDER_COLUMN, { ascending: false })
      .limit(limit);
    if (type) historyQuery = historyQuery.eq('type', type);
    return historyQuery;
  };

  const queries = [];
  if (matchingIds.length > 0) {
    queries.push(buildQuery(fetchCap).in('inventory_item_id', matchingIds));
  }
  if (!type) {
    queries.push(
      buildQuery(fetchCap).in('type', ['ADD', 'DELETE']).ilike('note', `%${itemNameQuery}%`),
    );
  }

  if (queries.length === 0) {
    return { success: true, data: [], hasMore: false };
  }

  const results = await Promise.all(queries);
  for (const result of results) {
    if (result.error) {
      return { success: false, error: historyFetchError(result.error) };
    }
  }

  const byId = new Map<string, RawInventoryTransaction>();
  for (const result of results) {
    for (const row of (result.data ?? []) as RawInventoryTransaction[]) {
      byId.set(row.id, row);
    }
  }

  const merged = [...byId.values()].sort((a, b) => historyRowSortTime(b) - historyRowSortTime(a));
  const page = merged.slice(offset, offset + safeLimit + 1);
  const hasMore = page.length > safeLimit;

  return {
    success: true,
    data: page.slice(0, safeLimit),
    hasMore,
  };
}

export async function fetchTransactionHistoryPage(
  client: SupabaseClient,
  options: FetchTransactionHistoryOptions,
): Promise<
  | {
      success: true;
      data: ReturnType<typeof enrichTransactionRows>;
      hasMore: boolean;
    }
  | { success: false; error: string; data: []; hasMore: false }
> {
  try {
    const itemId = options?.itemId;
    const itemNameQuery = sanitizeHistorySearchQuery(options?.itemNameQuery);
    const safeLimit = sanitizeHistoryLimit(options?.limit);
    const offset = sanitizeHistoryOffset(options?.offset);
    const type = options?.type && options.type !== 'ALL' ? options.type : undefined;

    let query = client
      .from('inventory_transactions')
      .select(TRANSACTION_HISTORY_SELECT)
      .order(HISTORY_ORDER_COLUMN, { ascending: false });

    if (itemId) {
      query = query.eq('inventory_item_id', itemId);
    } else if (itemNameQuery) {
      const nameSearch = await fetchTransactionHistoryByItemName(client, {
        itemNameQuery,
        type,
        offset,
        safeLimit,
      });
      if (!nameSearch.success) {
        return { success: false, error: nameSearch.error, data: [], hasMore: false };
      }
      return {
        success: true,
        data: enrichTransactionRows(nameSearch.data),
        hasMore: nameSearch.hasMore,
      };
    }

    if (type) {
      query = query.eq('type', type);
    }

    query = query.range(offset, offset + safeLimit);

    const { data: transactionRows, error: txError } = await query;

    if (txError) {
      return {
        success: false,
        error: historyFetchError(txError),
        data: [],
        hasMore: false,
      };
    }

    const transactions = (transactionRows ?? []) as RawInventoryTransaction[];

    if (transactions.length === 0) {
      return { success: true, data: [], hasMore: false };
    }

    const hasMore = transactions.length > safeLimit;
    const visibleTransactions = transactions.slice(0, safeLimit);

    return {
      success: true,
      data: enrichTransactionRows(visibleTransactions),
      hasMore,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: historyFetchError(error),
      data: [],
      hasMore: false,
    };
  }
}
