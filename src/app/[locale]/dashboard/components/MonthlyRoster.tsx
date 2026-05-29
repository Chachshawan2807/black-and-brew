'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  format, 
  eachDayOfInterval, 
  getDay, 
  isSameDay, 
  parseISO,
  startOfMonth,
  endOfMonth
} from 'date-fns';
import { th } from 'date-fns/locale';
import { 
  User, 
  Users, 
  Calendar as CalendarIcon 
} from 'lucide-react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { ClickableInput } from '@/components/ui/ClickableInput';
import { fetchRosterData } from '@/app/actions/shift-actions';

interface Profile {
  id: string;
  full_name: string;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
}

interface Shift {
  id: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  status: string;
  metadata?: {
    location?: string;
  };
}

export default function MonthlyRoster() {
  // ตั้งค่าช่วงวันที่เริ่มต้นเริ่มต้นที่วันแรกถึงวันสุดท้ายของเดือนปัจจุบันตามปฏิทิน
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<'consolidated' | 'individual'>('consolidated');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [data, setData] = useState<{ profiles: Profile[]; shifts: Shift[]; holidays: Holiday[] }>({ profiles: [], shifts: [], holidays: [] });
  const [loading, setLoading] = useState(true);

  const daysInInterval = useMemo(() => {
    try {
      if (!startDate || !endDate) return [];
      return eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
    } catch (e) {
      return [];
    }
  }, [startDate, endDate]);

  useEffect(() => {
    async function loadData() {
      if (!startDate || !endDate) return;
      setLoading(true);
      const res = await fetchRosterData(startDate, endDate);
      if (res.success) {
        setData({ profiles: res.profiles, shifts: res.shifts, holidays: res.holidays });
        if (res.profiles.length > 0 && !selectedStaffId) {
          setSelectedStaffId(res.profiles[0].id);
        }
      }
      setLoading(false);
    }
    loadData();
  }, [startDate, endDate]);

  const getShiftDisplay = (shift: Shift) => {
    const loc = shift.metadata?.location || '';
    const cleanLoc = loc.replace(/^เข้ากะ\s*/, '').trim();
    
    // 1. กรณีลาพนักงาน (Priority สูงสุด)
    if (shift.status === 'on_leave' || cleanLoc === 'ลา') 
      return { text: 'ลา', color: 'bg-[#fff5f5] border-[#fee2e2] text-rose-900 border' };
    
    // 2. ตรวจสอบกะเวลาปกติ (รองรับทั้งแบบมีและไม่มี 0 นำหน้า)
    if (cleanLoc === '6:30' || cleanLoc === '06:30') 
      return { text: '06:30', color: 'bg-[#f0fdf4] border-[#dcfce7] text-emerald-900 border' };
    if (cleanLoc === '7:00' || cleanLoc === '07:00') 
      return { text: '07:00', color: 'bg-white border-neutral-100 text-black border' };
    if (cleanLoc === '8:00' || cleanLoc === '08:00') 
      return { text: '08:00', color: 'bg-[#fffbeb] border-[#fef3c7] text-amber-900 border' };
    
    // 3. กะงานพิเศษ (ไปสาขา 2, ร้านซักผ้า) -> ใช้สีฟ้า Sky
    if (cleanLoc === 'ไปสาขา 2' || cleanLoc === 'ร้านซักผ้า')
      return { text: cleanLoc, color: 'bg-[#f0f9ff] border-[#e0f2fe] text-sky-900 border' };
    
    // 4. กรณีอื่นๆ (Fallback หรือชื่ออื่นๆ)
    return { text: cleanLoc || 'งาน', color: 'bg-slate-50 text-slate-900' };
  };

  return (
    <div className="w-full bg-[#fdfcf0] rounded-[32px] p-4 md:p-8 border border-black/5 shadow-sm min-h-[700px] antialiased">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black flex items-center justify-center rounded-2xl shadow-lg">
            <CalendarIcon className="w-6 h-6 text-[#fdfcf0]" />
          </div>
          <h2 className="text-2xl text-black font-normal tracking-tight">ตารางเวรและภาพรวมช่วงวันที่</h2>
        </div>

        {/* ส่วนกล่องเปลี่ยนช่วงวันที่อิสระตามความต้องการใช้งานจริง */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-white rounded-3xl px-4 py-2 border border-black/10 shadow-sm gap-2">
            <ClickableInput
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              containerClassName="w-[130px] scale-90 origin-center"
            />
            <span className="text-[#000000] text-sm font-normal opacity-40 px-1">—</span>
            <ClickableInput
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              containerClassName="w-[130px] scale-90 origin-center"
            />
          </div>

          <div className="flex bg-neutral-200/50 rounded-[24px] p-1.5 gap-1.5 backdrop-blur-sm">
            <button 
              onClick={() => setActiveTab('consolidated')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all duration-300 ${activeTab === 'consolidated' ? 'bg-white shadow-md text-black' : 'text-black/60 hover:text-black'}`}
            >
              <Users className="w-4 h-4" />
              <span className="text-sm font-normal">รวมพนักงาน</span>
            </button>
            <button 
              onClick={() => setActiveTab('individual')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all duration-300 ${activeTab === 'individual' ? 'bg-white shadow-md text-black' : 'text-black/60 hover:text-black'}`}
            >
              <User className="w-4 h-4" />
              <span className="text-sm font-normal">รายบุคคล</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[500px] gap-4">
          <div className="w-12 h-12 border-4 border-black/10 border-t-black rounded-full animate-spin" />
          <p className="text-black font-normal animate-pulse">กำลังจัดแจงข้อมูลเวร...</p>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-black/5 overflow-hidden shadow-xl shadow-black/5">
          {activeTab === 'consolidated' ? (
            <ScrollArea.Root className="w-full h-[820px]">
              <ScrollArea.Viewport className="w-full h-full">
                <table className="w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-neutral-50/95 backdrop-blur-md">
                      <th className="sticky left-0 z-30 bg-neutral-50 p-6 text-left border-b border-r border-black/10 text-black font-normal w-fit whitespace-nowrap shadow-sm">
                        พนักงาน
                      </th>
                      {daysInInterval.map((day) => {
                        const isHoliday = data.holidays.some(h => isSameDay(parseISO(h.date), day));
                        return (
                          <th key={day.toISOString()} className="p-4 text-center border-b border-r border-black/5 text-black font-normal min-w-[65px] relative">
                            {isHoliday && <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full shadow-sm" title="วันหยุดนักขัตฤกษ์" />}
                            <div className="text-[11px] text-black font-normal uppercase mb-1 opacity-60">{format(day, 'EEE', { locale: th })}</div>
                            <div className="text-lg leading-none">{format(day, 'd')}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {data.profiles.map((profile) => (
                      <tr key={profile.id} className="group hover:bg-neutral-50 transition-colors">
                        <td className="sticky left-0 z-10 bg-white p-5 border-r border-b border-black/10 text-black font-normal text-sm group-hover:bg-neutral-50 transition-colors shadow-sm whitespace-nowrap">
                          {profile.full_name}
                        </td>
                        {daysInInterval.map((day) => {
                          const shift = data.shifts.find(s => s.employee_id === profile.id && isSameDay(parseISO(s.start_time), day));
                          const display = shift ? getShiftDisplay(shift) : null;
                          return (
                            <td key={day.toISOString()} className="p-2.5 py-2 border-r border-b border-black/5 h-20">
                              {display && (
                                <div className={`w-full h-full flex items-center justify-center rounded-xl text-[12px] font-normal shadow-sm p-2.5 text-center transition-transform active:scale-95 antialiased ${display.color}`}>
                                  {display.text}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation="horizontal" className="flex h-3 touch-none select-none bg-black/5 p-1 transition-colors hover:bg-black/10">
                <ScrollArea.Thumb className="relative flex-1 rounded-full bg-black/20 hover:bg-black/40" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          ) : (
            <div className="p-8">
              <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8 p-6 bg-neutral-50 rounded-3xl border border-black/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black rounded-xl"><User className="w-5 h-5 text-white" /></div>
                  <span className="text-black text-lg font-normal">เลือกพนักงาน:</span>
                </div>
                <select 
                  value={selectedStaffId || ''} 
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="flex-1 max-w-sm bg-white border border-black/10 rounded-2xl px-5 py-3 text-md text-black focus:outline-none focus:ring-4 focus:ring-black/5 transition-all appearance-none cursor-pointer"
                >
                  {data.profiles.map(p => <option key={p.id} value={p.id} className="text-black">{p.full_name}</option>)}
                </select>
              </div>

              {/* ปฏิทินรายบุคคลขยายขนาดกล่องและเพิ่ม Padding ป้องกันตัวอักษรชิดขอบ */}
              <div className="grid grid-cols-7 gap-2">
                {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map(day => (
                  <div key={day} className="p-4 text-center text-black text-[12px] font-normal uppercase tracking-wider">{day}</div>
                ))}
                {daysInInterval.length > 0 && Array.from({ length: getDay(daysInInterval[0]) }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-neutral-50/50 rounded-3xl h-36 border border-transparent" />
                ))}
                {daysInInterval.map((day) => {
                  const shift = data.shifts.find(s => s.employee_id === selectedStaffId && isSameDay(parseISO(s.start_time), day));
                  const display = shift ? getShiftDisplay(shift) : null;
                  return (
                    <div key={day.toISOString()} className="bg-neutral-50/30 h-36 p-4 flex flex-col justify-between rounded-[24px] border border-black/5 transition-all hover:bg-neutral-50 hover:shadow-lg">
                      <span className="text-black text-lg font-normal">{format(day, 'd')}</span>
                      {shift && display && (
                        <div className={`w-full p-2.5 rounded-xl flex items-center justify-center text-center text-[13px] font-normal leading-relaxed shadow-sm min-h-[50px] ${display.color}`}>
                          {display.text}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}