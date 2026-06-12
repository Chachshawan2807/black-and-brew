import MaintenanceClient from './MaintenanceClient';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { checkAuth } from '@/app/actions/auth';
import { requireServiceRoleKey } from '@/lib/security/server-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export default async function MaintenancePage({
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
    .from('service_records')
    .select(
      'id, start_date, equipment, detected_problem, task_type, work_details, recommended_frequency, cost, person_in_charge, status, notes, completion_date, created_at',
    )
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Supabase Error:', error.message, error.details);
  }

  return <MaintenanceClient initialRecords={data || []} />;
}
