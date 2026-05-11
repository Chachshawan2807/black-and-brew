import { Suspense } from 'react';
import LiveShiftList from './components/LiveShiftList';

import { Loader2, CalendarRange, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { startOfWeek, addDays, format } from 'date-fns';
import Image from 'next/image';


export default async function DashboardPage({

  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { locale } = await params;
  const { start: startParam, end: endParam } = await searchParams;

  // Default to current week (Monday-Start)
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const sunday = addDays(monday, 6);
  
  const startDate = startParam || format(monday, 'yyyy-MM-dd');
  const endDate = endParam || format(sunday, 'yyyy-MM-dd');

  // Fetch Data on Server
  const { data: profiles } = await supabase.from('profiles').select('*').order('display_order', { ascending: true });
  const { data: shifts } = await supabase.from('shifts')
    .select('*')
    .gte('start_time', startDate + 'T00:00:00')
    .lte('start_time', endDate + 'T23:59:59');
  const { data: holidays } = await supabase.from('holidays')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);



  return (
    <div className="min-h-screen bg-transparent p-4 md:p-12 text-[#000000] relative font-normal">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#000000]/5 pb-4">
          <div className="h-4">
            {/* Purified Minimalist Space */}
          </div>

          <div className="flex items-center relative z-[50]">
            <Image 
              src="/images/logo.png" 
              alt="BLACKANDBREW Logo" 
              width={180} 
              height={72} 
              className="object-contain"
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </div>
        </header>


        <main>
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
        </main>
      </div>
    </div>
  );
}