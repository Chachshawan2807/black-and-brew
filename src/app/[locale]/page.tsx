import { getTranslations } from 'next-intl/server';
import { supabase } from '@/lib/supabase';
import LiveStatusTracker from '@/components/dashboard/LiveStatusTracker';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay, addDays } from 'date-fns';
import { connection } from 'next/server';

export default async function IndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('Dashboard');

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

  const [{ data: profilesData }, { data: shiftsData }, { data: tomorrowShiftsData }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, schedule_order').order('schedule_order', { ascending: true }),
    supabase.from('shifts').select('employee_id, start_time, end_time, status, metadata').gte('start_time', startUtc).lte('start_time', endUtc),
    supabase.from('shifts').select('employee_id, start_time, end_time, status, metadata').gte('start_time', tomorrowStartUtc).lte('start_time', tomorrowEndUtc),
  ]);

  const profiles = profilesData || [];
  const shifts = shiftsData || [];
  const tomorrowShifts = tomorrowShiftsData || [];

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-inherit flex flex-col justify-start md:justify-center px-[clamp(1rem,5vw,2rem)] py-[clamp(1.5rem,5vw,2.5rem)]">
      <div className="max-w-3xl mx-auto w-full">
        <LiveStatusTracker
          initialProfiles={profiles}
          initialShifts={shifts}
          currentThaiDate={thaiFullDate}
          initialTomorrowShifts={tomorrowShifts}
          tomorrowThaiDate={tomorrowThaiDate}
        />
      </div>
    </div>
  );
}
