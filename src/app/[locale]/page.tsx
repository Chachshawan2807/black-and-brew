import HomePageClient from './_components/HomePageClient';
import { INVENTORY_ITEM_SELECT } from '@/lib/inventory-queries';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay, addDays, format } from 'date-fns';
import { connection } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { queryHomeMaintenanceTasks } from '@/lib/maintenance/fetch-home-maintenance';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return String(error);
}

export default async function IndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // ADR: BKK-TIME-ENGINE - บังคับใช้ขอบเขตวันแบบ UTC ISO สำหรับ Database
  // connection() signals Next.js 16 PPR that this route reads request-time data
  await connection();
  const now = new Date();
  const bkkNow = toZonedTime(now, 'Asia/Bangkok');
  
  // สร้างขอบเขตเวลาเริ่มและสิ้นสุดวันของไทยในรูปแบบ UTC ISO
  const startUtc = fromZonedTime(startOfDay(bkkNow), 'Asia/Bangkok').toISOString();
  const endUtc = fromZonedTime(endOfDay(bkkNow), 'Asia/Bangkok').toISOString();
  
  // รูปแบบหัวข้อภาษาไทยสากล: วันอังคารที่ 2 มิถุนายน 2569
  const thaiFullDate = bkkNow.toLocaleDateString('th-TH', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const bkkTomorrow = addDays(bkkNow, 1);
  const tomorrowStartUtc = fromZonedTime(startOfDay(bkkTomorrow), 'Asia/Bangkok').toISOString();
  const tomorrowEndUtc = fromZonedTime(endOfDay(bkkTomorrow), 'Asia/Bangkok').toISOString();
  const tomorrowThaiDate = bkkTomorrow.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const currentIsoDate = format(bkkNow, 'yyyy-MM-dd');

  const [
    { data: profilesData },
    { data: shiftsData },
    { data: tomorrowShiftsData },
    { data: inventoryData, error: inventoryError },
    { data: maintenanceTasks, error: maintenanceError },
  ] = await Promise.all([
    getSupabaseAdmin().from('profiles').select('id, full_name, schedule_order').order('schedule_order', { ascending: true }),
    getSupabaseAdmin().from('shifts').select('employee_id, start_time, end_time, status, metadata').gte('start_time', startUtc).lte('start_time', endUtc),
    getSupabaseAdmin().from('shifts').select('employee_id, start_time, end_time, status, metadata').gte('start_time', tomorrowStartUtc).lte('start_time', tomorrowEndUtc),
    getSupabaseAdmin().from('inventory_items').select(INVENTORY_ITEM_SELECT).order('sort_order', { ascending: true }),
    (async () => {
      try {
        // Use service-role admin — same as profiles/shifts/inventory.
        // Browser session tokens expire under long-lived Node ("JWT expired").
        return {
          data: await queryHomeMaintenanceTasks(getSupabaseAdmin(), currentIsoDate),
          error: null,
        };
      } catch (error) {
        return { data: [], error };
      }
    })(),
  ]);

  if (inventoryError) {
    console.error('Supabase Error:', inventoryError.message, inventoryError.details);
  }

  if (maintenanceError) {
    console.error('Supabase Error:', getErrorMessage(maintenanceError));
  }

  const profiles = profilesData || [];
  const shifts = shiftsData || [];
  const tomorrowShifts = tomorrowShiftsData || [];

  return (
    <HomePageClient
      locale={locale}
      profiles={profiles}
      shifts={shifts}
      tomorrowShifts={tomorrowShifts}
      currentThaiDate={thaiFullDate}
      tomorrowThaiDate={tomorrowThaiDate}
      inventoryItems={inventoryData || []}
      maintenanceTasks={maintenanceTasks || []}
    />
  );
}
