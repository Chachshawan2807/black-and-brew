import InventoryCountClient from './InventoryCountClient';
import { redirect } from 'next/navigation';
import { checkAuth } from '@/app/actions/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { INVENTORY_COUNT_SELECT } from '@/lib/inventory-queries';

export default async function InventoryCountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const authed = await checkAuth();
  if (!authed) {
    redirect(`/${locale}`);
  }

  const { data, error } = await getSupabaseAdmin()
    .from('inventory_items')
    .select(INVENTORY_COUNT_SELECT)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Supabase Error (Count Fetch):', error.message, error.details);
  }

  return <InventoryCountClient initialItems={data || []} locale={locale} />;
}
