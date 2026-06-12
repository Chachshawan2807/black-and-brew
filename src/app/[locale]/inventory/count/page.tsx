import InventoryCountClient from './InventoryCountClient';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { checkAuth } from '@/app/actions/auth';
import { requireServiceRoleKey } from '@/lib/security/server-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

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

  const supabaseAdmin = createClient(supabaseUrl, requireServiceRoleKey(), {
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
    },
  });

  const { data, error } = await supabaseAdmin
    .from('inventory_items')
    .select('id, name, stock, unit, sort_order')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Supabase Error (Count Fetch):', error.message, error.details);
  }

  return <InventoryCountClient initialItems={data || []} locale={locale} />;
}
