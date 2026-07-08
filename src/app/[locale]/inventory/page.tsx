import { redirect } from 'next/navigation';
import { checkAuth } from '@/app/actions/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { INVENTORY_ITEM_SELECT } from '@/lib/inventory-queries';
import { createLazyFeatureClient } from '@/lib/lazy-feature-client';
import type { ColumnSettings } from './types';

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

  const [configRes, inventoryRes] = await Promise.all([
    supabaseAdmin.from('inventory_config').select('settings').eq('id', 'column_labels').single(),
    supabaseAdmin
      .from('inventory_items')
      .select(INVENTORY_ITEM_SELECT)
      .order('sort_order', { ascending: true }),
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

  return (
    <InventoryClient
      initialItems={inventoryRes.data || []}
      initialColumnSettings={initialColumnSettings}
      locale={locale}
    />
  );
}
