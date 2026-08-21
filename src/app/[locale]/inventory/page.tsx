import { redirect } from 'next/navigation';
import { checkAuth } from '@/app/actions/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { INVENTORY_ITEM_SELECT } from '@/lib/inventory-queries';
import {
  fetchTransactionHistoryPage,
  HISTORY_PAGE_SIZE,
} from '@/lib/inventory-history-query';
import { parseWithdrawRequiredOrder } from '@/lib/inventory-withdraw-required-items';
import { createLazyFeatureClient } from '@/lib/lazy-feature-client';
import type { ColumnSettings } from './types';
import type { TransactionHistoryRow } from './_components/InventoryHistoryModal';
import {
  InventoryHistoryCacheSeed,
  type InventoryHistorySeedPage,
} from './_components/InventoryHistoryCacheSeed';
import type { InventoryTransactionFilterType } from '@/lib/inventory-history-query';

const HISTORY_FILTER_TYPES: Exclude<InventoryTransactionFilterType, 'ALL'>[] = [
  'IN',
  'OUT',
  'ADJUST',
];

const InventoryClient = createLazyFeatureClient(
  () => import('./InventoryClient'),
  'กำลังโหลดข้อมูลสต็อกล่าสุด...',
);

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, authed] = await Promise.all([params, checkAuth()]);
  if (!authed) {
    redirect(`/${locale}`);
  }

  const supabaseAdmin = getSupabaseAdmin();

  const [configRes, inventoryRes, historyAllRes, ...historyFilterResults, withdrawOrderRes] =
    await Promise.all([
    supabaseAdmin.from('inventory_config').select('settings').eq('id', 'column_labels').single(),
    supabaseAdmin
      .from('inventory_items')
      .select(INVENTORY_ITEM_SELECT)
      .order('sort_order', { ascending: true }),
    fetchTransactionHistoryPage(supabaseAdmin, {
      offset: 0,
      limit: HISTORY_PAGE_SIZE,
      type: 'ALL',
    }),
    ...HISTORY_FILTER_TYPES.map((type) =>
      fetchTransactionHistoryPage(supabaseAdmin, {
        offset: 0,
        limit: HISTORY_PAGE_SIZE,
        type,
      }),
    ),
    supabaseAdmin.from('inventory_config').select('settings').eq('id', 'withdraw_required_order').single(),
  ]);

  if (inventoryRes.error) {
    console.error('Supabase Error:', inventoryRes.error.message, inventoryRes.error.details);
  }

  let initialColumnSettings: ColumnSettings = null;
  if (configRes.data?.settings) {
    const settings = configRes.data.settings as NonNullable<ColumnSettings>;
    if (settings.order && settings.labels) {
      initialColumnSettings = settings;
    }
  }

  let initialTransactionHistory: TransactionHistoryRow[] = [];
  let initialHistoryHasMore = false;
  if (historyAllRes.success && historyAllRes.data) {
    initialTransactionHistory = historyAllRes.data as TransactionHistoryRow[];
    initialHistoryHasMore = historyAllRes.hasMore;
  } else if (!historyAllRes.success) {
    console.error(
      'Supabase Error:',
      historyAllRes.error,
    );
  }

  const initialFilterPages: InventoryHistorySeedPage[] = HISTORY_FILTER_TYPES.flatMap((type, index) => {
    const res = historyFilterResults[index];
    if (!res?.success || !res.data) return [];
    return [{ type, rows: res.data as TransactionHistoryRow[], hasMore: res.hasMore }];
  });

  const initialWithdrawRequiredOrder = parseWithdrawRequiredOrder(withdrawOrderRes.data?.settings);

  return (
    <>
      <InventoryHistoryCacheSeed
        initialTransactionHistory={initialTransactionHistory}
        initialHistoryHasMore={initialHistoryHasMore}
        initialFilterPages={initialFilterPages}
      />
      <InventoryClient
        initialItems={inventoryRes.data || []}
        initialColumnSettings={initialColumnSettings}
        initialTransactionHistory={initialTransactionHistory}
        initialHistoryHasMore={initialHistoryHasMore}
        initialWithdrawRequiredOrder={initialWithdrawRequiredOrder}
        locale={locale}
      />
    </>
  );
}
