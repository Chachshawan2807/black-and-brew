'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Clock } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  schedule_order: number; // เพิ่มเข้ามาสำหรับ sorting
}

interface Shift {
  employee_id: string;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  status: 'scheduled' | 'on_leave' | 'day_off';
  metadata?: {
    location?: string; // เช่น "หน้าร้าน", "ร้านซักผ้า"
  };
}

interface LiveStatusTrackerProps {
  initialProfiles: Profile[];
  initialShifts: Shift[];
  currentThaiDate?: string;
}

/**
 * LiveStatusTracker (v2026.1)
 * ADR: Real-time Staff Presence Monitoring
 * Enforces: Zero-Gray, Zero-Bold, and Real-time Persistence.
 */
export default function LiveStatusTracker({ initialProfiles, initialShifts, currentThaiDate }: LiveStatusTrackerProps) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [shifts, setShifts] = useState(initialShifts);
  const [now, setNow] = useState(new Date());

  // ADR: PROP-SYNC-ENFORCER - ยืนยันการอัปเดต State เมื่อ Props จาก Server เปลี่ยนแปลง
  // ป้องกันปัญหาข้อมูลไม่อัปเดตเมื่อมีการ Refresh หน้าจอ
  useEffect(() => {
    setProfiles(initialProfiles);
    setShifts(initialShifts);
  }, [initialProfiles, initialShifts]);

  useEffect(() => {
    // 1. ระบบ Real-time Listener: ฟังการเปลี่ยนแปลงกะงาน (Insert/Update/Delete)
    const channel = supabase
      .channel('live-shifts-presence')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'shifts' 
      }, async () => {
        // ADR: REALTIME-SYNC-BKK - บังคับใช้ขอบเขตวันแบบ UTC ISO สำหรับ Database
        const nowTs = new Date();
        const bkkNow = toZonedTime(nowTs, 'Asia/Bangkok');
        const startUtc = fromZonedTime(startOfDay(bkkNow), 'Asia/Bangkok').toISOString();
        const endUtc = fromZonedTime(endOfDay(bkkNow), 'Asia/Bangkok').toISOString();

        const [{ data: updatedProfiles }, { data: updatedShifts }] = await Promise.all([
          supabase.from('profiles').select('id, full_name, schedule_order').order('schedule_order', { ascending: true }),
          supabase.from('shifts').select('employee_id, start_time, end_time, status, metadata').gte('start_time', startUtc).lte('start_time', endUtc)
        ]);
        
        if (updatedProfiles) setProfiles(updatedProfiles);
        if (updatedShifts) setShifts(updatedShifts);
      })
      .subscribe();

    // 2. ระบบ Time Engine: อัปเดตสถานะทุก 60 วินาที เพื่อคำนวณช่วงเวลาการเข้ากะ
    const timer = setInterval(() => setNow(new Date()), 60000);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  // ตรรกะการคำนวณสถานะและเวลากะงาน
  const getEmployeeStatus = (profile: Profile) => {
    /**
     * SECURITY HARDENING: Key-based Lookup
     * ค้นหาข้อมูลกะงานที่ตรงกับ employee_id ของ profile อย่างแม่นยำ
     * ป้องกันการสลับตัวบุคคล (Data Leakage)
     */
    const employeeShift = shifts.find(s => s.employee_id === profile.id && s.status !== 'day_off');

    let timeLabel = "วันหยุด";
    let isWorkingNow = false;
    let sortWeight = 99; // 1: Normal, 2: Special, 98: Leave, 99: Day Off
    let sortTime = 0;

    if (employeeShift) {
      const startBkk = toZonedTime(parseISO(employeeShift.start_time), 'Asia/Bangkok');
      sortTime = startBkk.getTime();

      const loc = employeeShift.metadata?.location || '';
      const status = employeeShift.status;

      if (status === 'on_leave') {
        timeLabel = "ลา";
        sortWeight = 98;
      } else if (status === 'scheduled') {
        isWorkingNow = true;
        const isSpecial = loc === 'ไปสาขา 2' || loc === 'ร้านซักผ้า';
        
        // ADR: TIME-EXTRACTOR-V2 - ค้นหารูปแบบเวลา (เช่น 6:30) จาก Metadata ก่อนเป็นอันดับแรก
        // เพื่อแก้ปัญหา "07:00 Bug" ในกรณีที่ start_time เก็บค่าเฉพาะวันที่
        const timeMatch = loc.match(/\d{1,2}:\d{2}/);

        if (isSpecial) {
          timeLabel = loc;
          sortWeight = 2;
        } else if (timeMatch) {
          timeLabel = `${timeMatch[0]} น.`;
          sortWeight = 1;
        } else {
          const timeStr = startBkk.toLocaleTimeString('th-TH', { hour: 'numeric', minute: '2-digit', hour12: false }).replace('.', ':');
          timeLabel = `${timeStr} น.`;
          sortWeight = 1;
        }
      }
    }

    return { timeLabel, isWorkingNow, sortWeight, sortTime };
  };

  // จัดเรียงลำดับ: กะปกติ (ตามเวลา) -> งานนอกสถานที่ -> ลา -> วันหยุด
  const sortedProfiles = [...profiles].sort((a, b) => {
    const sA = getEmployeeStatus(a);
    const sB = getEmployeeStatus(b);
    if (sA.sortWeight !== sB.sortWeight) return sA.sortWeight - sB.sortWeight;
    if (sA.sortTime !== sB.sortTime) return sA.sortTime - sB.sortTime;
    return a.schedule_order - b.schedule_order;
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-[0.75rem]">
      {sortedProfiles.map((profile) => {
        const { timeLabel, isWorkingNow } = getEmployeeStatus(profile);
        return (
          <article 
            key={profile.id}
            aria-label={`พนักงาน: ${profile.full_name}, วันที่: ${currentThaiDate}, กะงาน: ${timeLabel}, สถานะปัจจุบัน: ${isWorkingNow ? 'กำลังปฏิบัติงาน' : 'อยู่นอกเวลาปฏิบัติงาน'}`}
            className="bg-white/90 backdrop-blur-xl border border-black/[0.05] p-[1rem] rounded-3xl flex flex-col gap-[0.25rem] transition-all duration-300 hover:shadow-sm"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[0.93rem] font-normal text-black truncate">
                {profile.full_name}
              </span>
              <div 
                className="flex items-center justify-center w-[1rem] h-[1rem]"
                aria-label={isWorkingNow ? "กำลังปฏิบัติงาน" : "ไม่อยู่ในกะ"}
                aria-live="polite"
              >
                <div 
                  className={`w-[0.55rem] h-[0.55rem] rounded-full transition-all duration-500 ${
                    isWorkingNow 
                      ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' 
                      : 'bg-red-500'
                  }`} 
                />
              </div>
            </div>
            <div className="flex items-center gap-[0.35rem] text-[0.8rem] font-normal text-black">
              <Clock className="w-[0.85rem] h-[0.85rem] text-black" strokeWidth={1.5} />
              <span>{timeLabel}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}