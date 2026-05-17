import { supabase } from '@/lib/supabase';
import ScheduleClient from './ScheduleClient';
import { startOfWeek, addDays, format } from 'date-fns';

export default async function SchedulePage({

  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { locale } = await params;
  const { week: weekParam } = await searchParams;

  // Logic: Monday-Start
  const baseDate = weekParam ? new Date(weekParam) : new Date();
  const monday = startOfWeek(baseDate, { weekStartsOn: 1 });
  const sunday = addDays(monday, 6);

  const mondayStr = format(monday, 'yyyy-MM-dd');
  const sundayStr = format(sunday, 'yyyy-MM-dd');

  // Fetch Data on Server
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, schedule_order').order('schedule_order', { ascending: true });
  const { data: shifts } = await supabase.from('shifts')
    .select('id, employee_id, start_time, end_time, status, metadata')
    .gte('start_time', mondayStr + 'T00:00:00')
    .lte('start_time', sundayStr + 'T23:59:59')
    .not('status', 'is', null)
    .not('status', 'eq', '')
    .not('metadata->>location', 'is', null)
    .not('metadata->>location', 'eq', '');

  const { data: holidays } = await supabase.from('holidays')
    .select('id, date, name')
    .gte('date', mondayStr)
    .lte('date', sundayStr);

  return (
    <ScheduleClient 
      initialProfiles={profiles || []}
      initialShifts={shifts || []}
      initialHolidays={holidays || []}
      initialDateStr={mondayStr}
      locale={locale}
    />
  );
}