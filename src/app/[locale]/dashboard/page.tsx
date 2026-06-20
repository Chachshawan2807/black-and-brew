import { Suspense } from 'react';
import LiveShiftList from './components/LiveShiftList';
import MonthlyRoster from './components/MonthlyRoster'; // เชื่อมต่อตารางรายเดือนตัวใหม่เรียบร้อย
import { cookies } from 'next/headers';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { startOfWeek, addDays, format, startOfMonth, endOfMonth } from 'date-fns';

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const [{ start: startParam, end: endParam }, cookieStore] = await Promise.all([
    searchParams,
    cookies(),
  ]);
  
  const savedStart = cookieStore.get('dashboard_start_date')?.value;
  const savedEnd = cookieStore.get('dashboard_end_date')?.value;

  // Default to current week (Monday-Start)
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const sunday = addDays(monday, 6);
  
  // ลำดับความสำคัญ: 1. จาก URL -> 2. จาก Cookie ที่เคยเลือกไว้ -> 3. ค่าเริ่มต้นของสัปดาห์ปัจจุบัน
  const startDate = startParam || savedStart || format(monday, 'yyyy-MM-dd');
  const endDate = endParam || savedEnd || format(sunday, 'yyyy-MM-dd');

  // Prefetch MonthlyRoster data (current month) in parallel with weekly data
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  // Fetch Data on Server (รักษาฐานข้อมูลและความปลอดภัยเดิมไว้ครบถ้วน)
  const [
    { data: profiles },
    { data: shifts },
    { data: holidays },
    { data: rosterProfiles },
    { data: rosterShifts },
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name, dashboard_order').order('dashboard_order', { ascending: true }),
    supabase.from('shifts')
      .select('id, employee_id, start_time, end_time, status, metadata')
      .gte('start_time', startDate + 'T00:00:00')
      .lte('start_time', endDate + 'T23:59:59'),
    supabase.from('holidays')
      .select('id, date, name')
      .gte('date', startDate)
      .lte('date', endDate),
    supabase.from('profiles').select('id, full_name').order('schedule_order', { ascending: true }),
    supabase.from('shifts')
      .select('id, employee_id, start_time, end_time, status, metadata')
      .gte('start_time', monthStart + 'T00:00:00')
      .lte('start_time', monthEnd + 'T23:59:59'),
  ]);

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-12 text-foreground relative font-normal">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-4">
          <div className="h-4">
            {/* Purified Minimalist Space */}
          </div>
        </header>

        <main className="space-y-12">
          {/* 1. ส่วนแสดงผลตารางกะงานรายสัปดาห์เดิม */}
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-gray-300" strokeWidth={1.5} />
              <span className="text-base tracking-wide uppercase">Fetching Live Data...</span>
            </div>
          }>
            <LiveShiftList 
              initialProfiles={profiles || []} 
              initialShifts={shifts || []} 
              initialHolidays={holidays || []}
              startDate={startDate}
              endDate={endDate}
            />
          </Suspense>

          {/* 2. ส่วนแสดงผลตารางเวรและตรวจสอบกะงานแบบรายเดือนภาพรวม (ส่วนที่อัปเดตเพิ่มใหม่) */}
          <div className="pt-8 border-t border-[#000000]/5">
            <MonthlyRoster
              initialProfiles={rosterProfiles || []}
              initialShifts={rosterShifts || []}
              initialStartDate={monthStart}
              initialEndDate={monthEnd}
            />
          </div>
        </main>
      </div>
    </div>
  );
}