'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  format, 
  eachDayOfInterval, 
  getDay, 
  isSameDay, 
  parseISO,
  startOfMonth,
  endOfMonth,
  isBefore,
  isValid
} from 'date-fns';
import { th } from 'date-fns/locale';
import { 
  User, 
  Users, 
  Calendar as CalendarIcon 
} from 'lucide-react';
import { fetchRosterData } from '@/app/actions/shift-actions';
import { ClickableDatePicker } from '@/components/ui/ClickableDatePicker';
import { getShiftColorClass, getShiftDisplayText } from '@/lib/shift-colors';

interface Profile {
  id: string;
  full_name: string;
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
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<'consolidated' | 'individual'>('consolidated');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [data, setData] = useState<{ profiles: Profile[]; shifts: Shift[] }>({ profiles: [], shifts: [] });
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
        setData({ profiles: res.profiles, shifts: res.shifts });
        if (res.profiles.length > 0 && !selectedStaffId) {
          setSelectedStaffId(res.profiles[0].id);
        }
      }
      setLoading(false);
    }
    loadData();
  }, [startDate, endDate]);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStartDate(val);
    if (endDate && val && isBefore(parseISO(endDate), parseISO(val))) {
      setEndDate('');
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (startDate && val && isBefore(parseISO(val), parseISO(startDate))) return;
    setEndDate(val);
  };

  const getShiftDisplay = (shift: Shift) => {
    const loc = shift.metadata?.location || '';
    return {
      text: getShiftDisplayText(loc, shift.status),
      color: getShiftColorClass(loc, shift.status),
    };
  };

  return (
    <div className="w-full bg-card rounded-[32px] p-4 md:p-8 border border-border shadow-sm min-h-[700px] antialiased">
      {/* Header Controls */}
      <div className="relative z-30 flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black flex items-center justify-center rounded-2xl shadow-lg">
            <CalendarIcon className="w-6 h-6 text-[#fdfcf0]" />
          </div>
          <h2 className="text-2xl text-foreground font-normal tracking-tight">ตารางเวรและภาพรวมช่วงวันที่</h2>
        </div>

        <div className="flex flex-col md:flex-row flex-wrap items-start md:items-center gap-4 md:gap-6 w-full lg:w-auto">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex-1">
              <ClickableDatePicker
                value={startDate}
                onChange={handleStartDateChange}
                placeholder="เริ่ม"
                containerClassName="w-full"
              />
            </div>
            <span className="text-foreground font-normal select-none shrink-0">—</span>
            <div className="flex-1">
              <ClickableDatePicker
                value={endDate}
                onChange={handleEndDateChange}
                min={startDate}
                placeholder="สิ้นสุด"
                containerClassName="w-full"
              />
            </div>
          </div>

          <div className="flex bg-muted rounded-[24px] p-1.5 gap-1.5">
            <button 
              onClick={() => setActiveTab('consolidated')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all duration-300 ${activeTab === 'consolidated' ? 'bg-card shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground hover:opacity-100 opacity-60'}`}
            >
              <Users className="w-4 h-4" />
              <span className="text-sm font-normal">รวมพนักงาน</span>
            </button>
            <button 
              onClick={() => setActiveTab('individual')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all duration-300 ${activeTab === 'individual' ? 'bg-card shadow-md text-foreground' : 'text-muted-foreground hover:text-foreground hover:opacity-100 opacity-60'}`}
            >
              <User className="w-4 h-4" />
              <span className="text-sm font-normal">รายบุคคล</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[500px] gap-4">
          <div className="w-12 h-12 border-4 border-border border-t-foreground rounded-full animate-spin" />
          <p className="text-foreground font-normal animate-pulse">บรูกำลังจัดแจงข้อมูลเวรให้สักครู่นะคะ...</p>
        </div>
      ) : (
        <div className="bg-card rounded-[32px] border border-border shadow-xl shadow-black/5">
          {activeTab === 'consolidated' ? (
            <div className="w-full overflow-x-auto">
              <table className="w-max min-w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="sticky left-0 z-30 bg-muted/50 p-4 text-left border-b border-r border-border text-foreground font-normal whitespace-nowrap shadow-sm">
                      พนักงาน
                    </th>
                    {daysInInterval.map((day) => (
                      <th key={day.toISOString()} className="p-3 text-center border-b border-r border-border text-foreground font-normal min-w-[75px]">
                        <div className="text-[11px] text-foreground font-normal uppercase mb-1 opacity-80">{format(day, 'EEE', { locale: th })}</div>
                        <div className="text-lg leading-none">{format(day, 'd')}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.profiles.map((profile) => (
                    <tr key={profile.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="sticky left-0 z-10 bg-card p-4 border-r border-b border-border text-foreground font-normal text-sm group-hover:bg-muted/30 transition-colors whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        {profile.full_name}
                      </td>
                      {daysInInterval.map((day) => {
                        const shift = data.shifts.find(s => s.employee_id === profile.id && isSameDay(parseISO(s.start_time), day));
                        const display = shift ? getShiftDisplay(shift) : null;
                        return (
                          <td key={day.toISOString()} className="p-1.5 border-r border-b border-border h-[4.25rem] align-middle">
                            {display && (
                              <div className={`w-full h-full min-h-[3rem] flex items-center justify-center rounded-xl text-[12px] font-normal shadow-sm p-1 text-center ${display.color}`}>
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
            </div>
          ) : (
            <div className="p-8">
              <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8 p-6 bg-muted/50 rounded-3xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black rounded-xl"><User className="w-5 h-5 text-[#fdfcf0]" /></div>
                  <span className="text-foreground text-lg font-normal">เลือกพนักงาน:</span>
                </div>
                <select 
                  value={selectedStaffId || ''} 
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="flex-1 max-w-sm bg-card border border-border rounded-2xl px-5 py-3 text-md text-foreground focus:outline-none focus:ring-4 focus:ring-border transition-all appearance-none cursor-pointer"
                >
                  {data.profiles.map(p => <option key={p.id} value={p.id} className="text-foreground">{p.full_name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-7 gap-1 md:gap-2 pb-24">
                {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map((day, idx) => {
                  const fullDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
                  return (
                    <div key={day} className="py-2 px-1 text-center text-foreground text-[11px] md:text-[12px] font-normal uppercase tracking-wider">
                      <span className="md:hidden">{day}</span>
                      <span className="hidden md:inline">{fullDays[idx]}</span>
                    </div>
                  );
                })}
                {daysInInterval.length > 0 && Array.from({ length: getDay(daysInInterval[0]) }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-muted/30 rounded-xl sm:rounded-3xl h-20 sm:h-28 md:h-36 border border-transparent" />
                ))}
                {daysInInterval.map((day) => {
                  const shift = data.shifts.find(s => s.employee_id === selectedStaffId && isSameDay(parseISO(s.start_time), day));
                  const display = shift ? getShiftDisplay(shift) : null;
                  return (
                    <div key={day.toISOString()} className="bg-muted/30 h-20 sm:h-28 md:h-36 p-1 sm:p-3 md:p-4 flex flex-col justify-between rounded-xl sm:rounded-[24px] border border-border transition-all hover:bg-muted/30 hover:shadow-lg">
                      <span className="text-foreground text-sm sm:text-base md:text-lg font-normal">{format(day, 'd')}</span>
                      {shift && display && (
                        <div className={`w-full p-0.5 sm:p-2 md:p-2.5 rounded-lg sm:rounded-xl flex items-center justify-center text-center text-[10px] sm:text-xs md:text-[13px] font-normal leading-tight md:leading-relaxed shadow-sm min-h-[24px] sm:min-h-[40px] md:min-h-[50px] truncate ${display.color}`}>
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