import { redirect } from 'next/navigation';
import { checkAuth } from '@/app/actions/auth';
import { fetchBranchWithdrawalHistory } from '@/app/actions/branch-withdraw-actions';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { INVENTORY_ITEM_SELECT } from '@/lib/inventory-queries';
import { createLazyFeatureClient } from '@/lib/lazy-feature-client';

const BranchWithdrawClient = createLazyFeatureClient(
  () => import('./BranchWithdrawClient'),
  'กำลังโหลดหน้าเบิกของสาขา 2...',
);

export default async function BranchWithdrawPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, authed] = await Promise.all([params, checkAuth()]);
  if (!authed) redirect(`/${locale}`);

  const [itemsResult, historyResult] = await Promise.all([
    getSupabaseAdmin()
      .from('inventory_items')
      .select(INVENTORY_ITEM_SELECT)
      .order('sort_order', { ascending: true }),
    fetchBranchWithdrawalHistory(30),
  ]);

  if (itemsResult.error) {
    console.error('Supabase Error (Branch Withdraw Fetch):', itemsResult.error.message, itemsResult.error.details);
  }

  return (
    <BranchWithdrawClient
      initialItems={itemsResult.data ?? []}
      initialHistory={historyResult.success ? historyResult.data : []}
      locale={locale}
    />
  );
}
