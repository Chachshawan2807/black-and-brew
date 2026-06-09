import ScheduleClient from './ScheduleClient';
import { startOfWeek, addDays, format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { checkAuth } from '@/app/actions/auth';
import { groupRegularHolidayRows } from '@/lib/regular-holidays';
import { fetchAndPersistHolidays } from '@/lib/holiday-sync';
import { requireServiceRoleKey } from '@/lib/security/server-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export default async function SchedulePage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { locale } = await params;
  const { week: weekParam } = await searchParams;

  const authed = await checkAuth();
  if (!authed) {
    redirect(`/${locale}`);
  }

  const supabaseAdmin = createClient(supabaseUrl, requireServiceRoleKey(), {
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
    }
  });

  const baseDate = weekParam ? new Date(weekParam) : new Date();
  const monday = startOfWeek(baseDate, { weekStartsOn: 1 });
  const sunday = addDays(monday, 6);

  const mondayStr = format(monday, 'yyyy-MM-dd');
  const sundayStr = format(sunday, 'yyyy-MM-dd');

  const holidaySync = await fetchAndPersistHolidays(mondayStr, sundayStr);
  if (!holidaySync.success && holidaySync.error !== 'Missing API Key') {
    console.error('Holiday sync failed:', holidaySync.error);
  }

  // ใช้ Admin Fetch เพื่อหลีกเลี่ยงการถูกบล็อกข้อมูลจาก RLS
  const [profilesRes, shiftsRes, holidaysRes, regularHolidaysRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, full_name, schedule_order').order('schedule_order', { ascending: true }),
    supabaseAdmin.from('shifts')
      .select('id, employee_id, start_time, end_time, status, metadata')
      .gte('start_time', mondayStr + 'T00:00:00')
      .lte('start_time', sundayStr + 'T23:59:59')
      .not('status', 'is', null)
      .not('status', 'eq', '')
      .not('metadata->>location', 'is', null)
      .not('metadata->>location', 'eq', ''),
    supabaseAdmin.from('holidays').select('id, date, name').gte('date', mondayStr).lte('date', sundayStr),
    supabaseAdmin.from('regular_holidays').select('id, profile_id, day_of_week')
  ]);

  const normalizedShifts = (shiftsRes.data || []).map(s => {
    const datePart = s.start_time.split('T')[0];
    return { ...s, start_time: datePart + 'T00:00:00', end_time: datePart + 'T23:59:59' };
  });

  if (regularHolidaysRes.error) {
    console.error('Supabase Error:', regularHolidaysRes.error.message, regularHolidaysRes.error.details);
  }

  return (
    <ScheduleClient
      initialProfiles={profilesRes.data || []}
      initialShifts={normalizedShifts}
      initialHolidays={holidaysRes.data || []}
      initialRegularHolidays={groupRegularHolidayRows(regularHolidaysRes.data)}
      initialDateStr={mondayStr}
      locale={locale}
    />
  );
}
