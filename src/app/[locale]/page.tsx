import { supabase } from '@/lib/supabase';
import HomePageClient from './_components/HomePageClient';
import { INVENTORY_ITEM_SELECT } from '@/lib/inventory-queries';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay, addDays, format } from 'date-fns';
import { connection } from 'next/server';
import { computeMaintenanceDueWithinMonth } from '@/lib/maintenance/filter-due-within-month';
import type { MaintenanceServiceRecord } from '@/lib/maintenance/types';

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
    { data: serviceRecordsData, error: serviceRecordsError },
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name, schedule_order').order('schedule_order', { ascending: true }),
    supabase.from('shifts').select('employee_id, start_time, end_time, status, metadata').gte('start_time', startUtc).lte('start_time', endUtc),
    supabase.from('shifts').select('employee_id, start_time, end_time, status, metadata').gte('start_time', tomorrowStartUtc).lte('start_time', tomorrowEndUtc),
    supabase.from('inventory_items').select(INVENTORY_ITEM_SELECT).order('sort_order', { ascending: true }),
    supabase
      .from('service_records')
      .select(
        'id, equipment, work_details, start_date, completion_date, recommended_frequency, status, task_type',
      )
      .order('start_date', { ascending: false }),
  ]);

  if (inventoryError) {
    console.error('Supabase Error:', inventoryError.message, inventoryError.details);
  }

  if (serviceRecordsError) {
    console.error('Supabase Error:', serviceRecordsError.message, serviceRecordsError.details);
  }

  const maintenanceTasks = computeMaintenanceDueWithinMonth(
    (serviceRecordsData || []) as MaintenanceServiceRecord[],
    currentIsoDate,
  );

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
      maintenanceTasks={maintenanceTasks}
    />
  );
}
