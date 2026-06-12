'use client';

import { useState, useEffect, useCallback } from 'react';

const SHIFT_STATUS_COLUMNS = 'id, employee_id, status, start_time, end_time';
import { supabase } from '@/lib/supabase';
import { toZonedTime } from 'date-fns-tz';
import { parseISO, isWithinInterval } from 'date-fns';
import { Circle } from 'lucide-react';

interface LiveStatusTrackerProps {
  initialProfiles: any[];
  initialShifts: any[];
}

export default function LiveStatusTracker({ initialProfiles, initialShifts }: LiveStatusTrackerProps) {
  const [shifts, setShifts] = useState(initialShifts);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // 1. ระบบ Real-time Listener: ฟังการเปลี่ยนแปลงกะงาน
    const channel = supabase
      .channel('live-shifts-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, async () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data } = await supabase.from('shifts').select(SHIFT_STATUS_COLUMNS).gte('start_time', `${todayStr}T00:00:00Z`);
        if (data) setShifts(data);
      })
      .subscribe();

    // 2. ระบบ Time Engine: อัปเดตการคำนวณสถานะทุก 60 วินาที
    const timer = setInterval(() => setNow(new Date()), 60000);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const checkIsWorking = useCallback((profileId: string) => {
    const employeeShift = shifts.find(s => s.employee_id === profileId && s.status === 'scheduled');
    if (!employeeShift) return false;

    const bkkNow = toZonedTime(now, 'Asia/Bangkok');
    const start = toZonedTime(parseISO(employeeShift.start_time), 'Asia/Bangkok');
    const end = toZonedTime(parseISO(employeeShift.end_time), 'Asia/Bangkok');

    return isWithinInterval(bkkNow, { start, end });
  }, [shifts, now]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-[0.75rem]">
      {initialProfiles.map((profile) => {
        const working = checkIsWorking(profile.id);
        return (
          <article 
            key={profile.id}
            className="bg-card border border-border p-[1rem] rounded-3xl flex items-center justify-between transition-all duration-300 hover:bg-muted/30 hover:shadow-sm"
          >
            <span className="text-[0.93rem] font-normal text-foreground truncate">
              {profile.full_name}
            </span>
            <div 
              className="flex items-center justify-center w-[1.25rem]"
              aria-label={working ? "กำลังปฏิบัติงาน" : "ไม่อยู่ในกะ"}
              aria-live="polite"
            >
              {working ? (
                <Circle className="w-[0.625rem] h-[0.625rem] fill-green-500 text-green-500 animate-pulse" />
              ) : (
                <Circle className="w-[0.625rem] h-[0.625rem] fill-red-500 text-red-500" />
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}