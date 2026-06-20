'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { parseISO, startOfDay, endOfDay, addDays } from 'date-fns';
import { CalendarDays, CalendarOff, CalendarX, CalendarClock, CalendarRange, Sun, type LucideIcon } from 'lucide-react';
import {
  getShiftColorClass,
  getShiftColorStyle,
  getShiftDisplayText,
  DAY_OFF_COLOR,
  type ShiftColorStyle,
} from '@/lib/shift-colors';

interface Profile {
  id: string;
  full_name: string;
  schedule_order: number;
}

interface Shift {
  employee_id: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'on_leave' | 'day_off';
  metadata?: {
    location?: string;
  };
}

interface LiveStatusTrackerProps {
  initialProfiles: Profile[];
  initialShifts: Shift[];
  currentThaiDate?: string;
  initialTomorrowShifts?: Shift[];
  tomorrowThaiDate?: string;
}

interface EmployeeStatus {
  displayText: string;
  colorClass: string;
  colorStyle?: ShiftColorStyle;
  sortWeight: number;
  sortTime: number;
  isWorkShift: boolean;
}

function getEmployeeStatus(profile: Profile, shifts: Shift[]): EmployeeStatus {
  const hasDayOff = shifts.some(
    (s) => s.employee_id === profile.id && s.status === 'day_off'
  );
  const employeeShift = shifts.find(
    (s) => s.employee_id === profile.id && s.status !== 'day_off'
  );

  if (hasDayOff || !employeeShift) {
    return {
      displayText: 'วันหยุด',
      colorClass: DAY_OFF_COLOR,
      sortWeight: 99,
      sortTime: 0,
      isWorkShift: false,
    };
  }

  const startBkk = toZonedTime(parseISO(employeeShift.start_time), 'Asia/Bangkok');
  const loc = employeeShift.metadata?.location || '';
  const status = employeeShift.status;
  const colorClass = getShiftColorClass(loc, status);
  const colorStyle = getShiftColorStyle(loc, status);

  let displayText = getShiftDisplayText(loc, status);
  let sortWeight = 1;
  let isWorkShift = true;

  if (status === 'on_leave' || loc === 'ลา') {
    sortWeight = 98;
    isWorkShift = false;
  } else if (loc === 'ไปสาขา 2' || loc === 'ร้านซักผ้า') {
    sortWeight = 2;
  } else if (!loc.match(/\d{1,2}:\d{2}/) && displayText === 'งาน') {
    const timeStr = startBkk
      .toLocaleTimeString('th-TH', { hour: 'numeric', minute: '2-digit', hour12: false })
      .replace('.', ':');
    displayText = timeStr;
  }

  // Parse time from displayText/location to establish a solid sort time (e.g., '6:30' -> hours=6, minutes=30)
  let sortTime = startBkk.getTime();
  const timeMatch = displayText.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const sortDate = new Date(startBkk);
    sortDate.setHours(hours, minutes, 0, 0);
    sortTime = sortDate.getTime();
  }

  return { displayText, colorClass, colorStyle, sortWeight, sortTime, isWorkShift };
}

function getShiftIcon(displayText: string): LucideIcon {
  if (displayText === 'วันหยุด') return CalendarOff;
  if (displayText === 'ลา') return CalendarX;
  if (displayText === 'ร้านซักผ้า' || displayText === 'ไปสาขา 2') return CalendarRange;
  if (/^\d{1,2}:\d{2}$/.test(displayText)) return CalendarClock;
  return CalendarDays;
}

function sortProfiles(profiles: Profile[], shifts: Shift[]): Profile[] {
  return [...profiles].sort((a, b) => {
    const sA = getEmployeeStatus(a, shifts);
    const sB = getEmployeeStatus(b, shifts);
    if (sA.sortWeight !== sB.sortWeight) return sA.sortWeight - sB.sortWeight;
    if (sA.sortTime !== sB.sortTime) return sA.sortTime - sB.sortTime;
    return a.schedule_order - b.schedule_order;
  });
}

async function fetchShiftsForBkkDay(bkkDate: Date): Promise<Shift[]> {
  const startUtc = fromZonedTime(startOfDay(bkkDate), 'Asia/Bangkok').toISOString();
  const endUtc = fromZonedTime(endOfDay(bkkDate), 'Asia/Bangkok').toISOString();
  const { data } = await supabase
    .from('shifts')
    .select('employee_id, start_time, end_time, status, metadata')
    .gte('start_time', startUtc)
    .lte('start_time', endUtc);
  return data ?? [];
}

interface StatusGridProps {
  profiles: Profile[];
  shifts: Shift[];
  dateLabel?: string;
  highlightToday?: boolean;
}

function StatusGrid({ profiles, shifts, dateLabel, highlightToday = false }: StatusGridProps) {
  const sortedProfiles = sortProfiles(profiles, shifts);

  return (
    <div className="flex flex-wrap gap-2.5">
      {sortedProfiles.map((profile) => {
        const { displayText, colorClass, colorStyle, isWorkShift } = getEmployeeStatus(profile, shifts);
        const ShiftIcon = getShiftIcon(displayText);

        return (
          <article
            key={profile.id}
            aria-label={`พนักงาน: ${profile.full_name}, วันที่: ${dateLabel}, กะงาน: ${displayText}`}
            className={`${colorClass} group relative w-[7.25rem] shrink-0 overflow-hidden rounded-2xl p-3 min-h-[4.75rem] flex flex-col justify-between gap-2 bb-transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] ${
              highlightToday && isWorkShift ? 'ring-2 ring-border bb-shadow-sm' : 'shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
            }`}
            style={colorStyle}
          >
            <span className="text-[0.8125rem] font-normal truncate leading-snug tracking-tight">
              {profile.full_name}
            </span>
            <span className="inline-flex items-center justify-center gap-1 self-center max-w-full px-2 py-0.5 rounded-full bg-black/[0.06] text-[0.6875rem] font-normal text-black/80 tracking-wide">
              <ShiftIcon className="h-3 w-3 shrink-0 opacity-70" strokeWidth={1.5} aria-hidden />
              <span className="truncate">{displayText}</span>
            </span>
          </article>
        );
      })}
    </div>
  );
}

interface StatusSectionProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  profiles: Profile[];
  shifts: Shift[];
  dateLabel?: string;
  highlightToday?: boolean;
}

function StatusSection({
  icon,
  title,
  subtitle,
  profiles,
  shifts,
  dateLabel,
  highlightToday,
}: StatusSectionProps) {
  return (
    <section
      aria-label={title}
      className="rounded-3xl border border-border bg-card p-5 md:p-7 bb-shadow-sm"
    >
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted bb-shadow-sm">
            {icon}
          </div>
          <div>
            <h2 className="text-[clamp(1rem,2.5vw,1.25rem)] font-normal text-foreground tracking-tight leading-snug">
              {title}
            </h2>
            <p className="mt-1 text-[0.8rem] font-normal text-muted-foreground/90 tracking-wide">{subtitle}</p>
          </div>
        </div>
        <span className="text-[0.7rem] font-normal text-muted-foreground/70 uppercase tracking-[0.2em] shrink-0">
          {profiles.length} พนักงาน
        </span>
      </header>
      <StatusGrid
        profiles={profiles}
        shifts={shifts}
        dateLabel={dateLabel}
        highlightToday={highlightToday}
      />
    </section>
  );
}

export default function LiveStatusTracker({
  initialProfiles,
  initialShifts,
  currentThaiDate,
  initialTomorrowShifts = [],
  tomorrowThaiDate,
}: LiveStatusTrackerProps) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [shifts, setShifts] = useState(initialShifts);
  const [tomorrowShifts, setTomorrowShifts] = useState(initialTomorrowShifts);

  useEffect(() => {
    setProfiles(initialProfiles);
    setShifts(initialShifts);
    setTomorrowShifts(initialTomorrowShifts);
  }, [initialProfiles, initialShifts, initialTomorrowShifts]);

  useEffect(() => {
    const refreshShifts = async () => {
      const bkkNow = toZonedTime(new Date(), 'Asia/Bangkok');
      const bkkTomorrow = addDays(bkkNow, 1);
      const [today, tomorrow] = await Promise.all([
        fetchShiftsForBkkDay(bkkNow),
        fetchShiftsForBkkDay(bkkTomorrow),
      ]);
      setShifts(today);
      setTomorrowShifts(tomorrow);
    };

    const refreshProfiles = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, schedule_order')
        .order('schedule_order', { ascending: true });
      if (data) setProfiles(data);
    };

    // Debounce timers to coalesce rapid-fire realtime events
    let shiftDebounce: ReturnType<typeof setTimeout> | null = null;
    let profileDebounce: ReturnType<typeof setTimeout> | null = null;

    const debouncedRefreshShifts = () => {
      if (shiftDebounce) clearTimeout(shiftDebounce);
      shiftDebounce = setTimeout(() => void refreshShifts(), 300);
    };

    const debouncedRefreshProfiles = () => {
      if (profileDebounce) clearTimeout(profileDebounce);
      profileDebounce = setTimeout(() => void refreshProfiles(), 300);
    };

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      await ensureSupabaseSession();
      if (cancelled) return;

      channel = supabase
        .channel('live-shifts-presence')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
          debouncedRefreshShifts();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          debouncedRefreshProfiles();
        })
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (shiftDebounce) clearTimeout(shiftDebounce);
      if (profileDebounce) clearTimeout(profileDebounce);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6 md:space-y-8">
      <StatusSection
        icon={<CalendarDays className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />}
        title="สถานะพนักงานวันนี้"
        subtitle={currentThaiDate ?? ''}
        profiles={profiles}
        shifts={shifts}
        dateLabel={currentThaiDate}
        highlightToday
      />

      {tomorrowThaiDate && (
        <StatusSection
          icon={<Sun className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />}
          title="กะวันถัดไป"
          subtitle={tomorrowThaiDate}
          profiles={profiles}
          shifts={tomorrowShifts}
          dateLabel={tomorrowThaiDate}
        />
      )}
    </div>
  );
}
