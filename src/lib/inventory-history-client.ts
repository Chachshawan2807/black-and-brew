'use client';

import {
  fetchTransactionHistoryPage,
  type FetchTransactionHistoryOptions,
  type InventoryHistoryDisplayRow,
} from '@/lib/inventory-history-query';
import { supabase } from '@/lib/supabase';
import { ensureSupabaseSession } from '@/lib/supabase-session';

type HistoryClientResult =
  | { success: true; data: InventoryHistoryDisplayRow[]; hasMore: boolean }
  | { success: false; error: string; data: InventoryHistoryDisplayRow[]; hasMore: false };

/** Direct Supabase read avoids Server Action + ensureServerSession round-trip on the client. */
export async function fetchTransactionHistoryClient(
  options: FetchTransactionHistoryOptions,
): Promise<HistoryClientResult> {
  const sessionOk = await ensureSupabaseSession();
  if (!sessionOk) {
    return {
      success: false,
      error: 'Unauthorized',
      data: [],
      hasMore: false,
    };
  }

  return fetchTransactionHistoryPage(supabase, options);
}
