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
import { InventoryHistoryCacheSeed } from './_components/InventoryHistoryCacheSeed';

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

  const [configRes, inventoryRes, historyRes, withdrawOrderRes] = await Promise.all([
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
  if (historyRes.success && historyRes.data) {
    initialTransactionHistory = historyRes.data as TransactionHistoryRow[];
    initialHistoryHasMore = historyRes.hasMore;
  } else if (!historyRes.success) {
    console.error(
      'Supabase Error:',
      historyRes.error,
    );
  }

  const initialWithdrawRequiredOrder = parseWithdrawRequiredOrder(withdrawOrderRes.data?.settings);

  return (
    <>
      <InventoryHistoryCacheSeed
        initialTransactionHistory={initialTransactionHistory}
        initialHistoryHasMore={initialHistoryHasMore}
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
