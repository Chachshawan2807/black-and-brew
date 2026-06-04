import { getTranslations } from 'next-intl/server';
import { supabase } from '@/lib/supabase';
import LiveStatusTracker from '@/components/dashboard/LiveStatusTracker';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';
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

  const [{ data: profilesData }, { data: shiftsData }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, schedule_order').order('schedule_order', { ascending: true }),
    supabase.from('shifts').select('employee_id, start_time, end_time, status, metadata').gte('start_time', startUtc).lte('start_time', endUtc)
  ]);

  const profiles = profilesData || [];
  const shifts = shiftsData || [];

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-inherit flex flex-col items-center justify-center relative px-[clamp(1rem,5vw,2rem)] py-[clamp(2rem,8vw,3rem)]">
      <div className="max-w-4xl w-full space-y-[clamp(2rem,8vw,3rem)]">
        <section aria-label="Staff Live Status" className="space-y-[1rem]">
          <h2 className="text-[clamp(1.1rem,3.5vw,1.4rem)] font-normal text-black px-[clamp(0.25rem,1vw,0.5rem)] uppercase tracking-widest leading-relaxed">
            สถานะพนักงาน — {thaiFullDate}
          </h2>
          <LiveStatusTracker initialProfiles={profiles} initialShifts={shifts} currentThaiDate={thaiFullDate} />
        </section>
      </div>
    </div>
  );
}
