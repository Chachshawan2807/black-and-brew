import { redirect } from 'next/navigation';
import { checkAuth } from '@/app/actions/auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { createLazyFeatureClient } from '@/lib/lazy-feature-client';

const MaintenanceClient = createLazyFeatureClient(
  () => import('./MaintenanceClient'),
  'กำลังโหลดข้อมูลซ่อมบำรุง...',
);

export default async function MaintenancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, authed] = await Promise.all([params, checkAuth()]);
  if (!authed) {
    redirect(`/${locale}`);
  }

  const { data, error } = await getSupabaseAdmin()
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
