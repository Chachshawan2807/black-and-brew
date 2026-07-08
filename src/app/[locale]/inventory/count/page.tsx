import { redirect } from 'next/navigation';
import { checkAuth } from '@/app/actions/auth';
import { fetchCountAccuracyStats } from '@/app/actions/inventory-actions';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { INVENTORY_COUNT_SELECT } from '@/lib/inventory-queries';
import { createLazyFeatureClient } from '@/lib/lazy-feature-client';

const InventoryCountClient = createLazyFeatureClient(
  () => import('./InventoryCountClient'),
  'กำลังโหลดหน้านับสต็อก...',
);

export default async function InventoryCountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, authed] = await Promise.all([params, checkAuth()]);
  if (!authed) {
    redirect(`/${locale}`);
  }

  const [itemsResult, accuracyResult] = await Promise.all([
    getSupabaseAdmin()
      .from('inventory_items')
      .select(INVENTORY_COUNT_SELECT)
      .order('sort_order', { ascending: true }),
    fetchCountAccuracyStats(),
  ]);

  const { data, error } = itemsResult;

  if (error) {
    console.error('Supabase Error (Count Fetch):', error.message, error.details);
  }

  const initialAccuracyStats =
    accuracyResult.success && accuracyResult.data ? accuracyResult.data : null;

  return (
    <InventoryCountClient
      initialItems={data || []}
      initialAccuracyStats={initialAccuracyStats}
      locale={locale}
    />
  );
}
