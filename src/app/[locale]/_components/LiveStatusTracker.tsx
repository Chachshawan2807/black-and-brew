'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useShiftRealtime } from '@/hooks/use-shift-realtime';
import { useDebouncedShiftRefresh } from '@/hooks/useDebouncedShiftRefresh';
import { fetchShiftsForBkkDayFromClient } from '@/lib/schedule/client-shift-queries';
import { toZonedTime } from 'date-fns-tz';
import { parseISO, addDays } from 'date-fns';
import { CalendarDays, CalendarOff, CalendarX, CalendarClock, CalendarRange, Sun, type LucideIcon } from '@/lib/icons';
import {
  getShiftColorClass,
  getShiftColorStyle,
  getShiftDisplayText,
  DAY_OFF_COLOR,
  type ShiftColorStyle,
} from '@/lib/shift-colors';
import { countFohCoffeeStaff } from '@/lib/foh-coffee-staff-count';
import { getClientShiftTypes } from '@/lib/shift-type-config';
import { cn } from '@/lib/utils';
import type { HomeSectionLayout } from './home-layout';

interface Profile {
  id: string;
  full_name: string;
  schedule_order: number;
}

interface Shift {
  id?: string;
  employee_id: string | null;
  start_time: string;
  end_time: string;
  status:
    | 'scheduled'
    | 'on_leave'
    | 'day_off'
    | 'completed'
    | 'swapped'
    | 'cancelled';
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
  layout?: HomeSectionLayout;
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

interface StatusGridProps {
  profiles: Profile[];
  shifts: Shift[];
  dateLabel?: string;
  dashboard?: boolean;
}

function StatusGrid({
  profiles,
  shifts,
  dateLabel,
  dashboard = false,
}: StatusGridProps) {
  const sortedProfiles = sortProfiles(profiles, shifts);

  return (
    <div
      className={cn(
        dashboard
          ? 'md:grid md:h-full md:min-h-0 md:grid-cols-[repeat(auto-fill,minmax(8.75rem,1fr))] md:auto-rows-[minmax(5.75rem,1fr)] md:gap-3 md:content-stretch md:items-stretch'
          : 'flex flex-wrap gap-2.5',
      )}
    >
      {sortedProfiles.map((profile) => {
        const { displayText, colorClass, colorStyle } = getEmployeeStatus(profile, shifts);
        const ShiftIcon = getShiftIcon(displayText);

        return (
          <article
            key={profile.id}
            aria-label={`พนักงาน: ${profile.full_name}, วันที่: ${dateLabel}, กะงาน: ${displayText}`}
            className={cn(
              colorClass,
              'group relative overflow-hidden rounded-2xl flex flex-col justify-between bb-transition bb-shadow-hover-md hover:-translate-y-0.5',
              dashboard
                ? 'w-full h-full min-h-[5.75rem] p-4 gap-2.5'
                : 'w-[7.25rem] shrink-0 p-3 min-h-[4.75rem] gap-2',
              'bb-shadow-sm',
            )}
            style={colorStyle}
          >
            <span
              className={cn(
                'font-normal truncate leading-snug tracking-tight',
                dashboard ? 'text-[0.9375rem]' : 'text-[0.8125rem]',
              )}
            >
              {profile.full_name}
            </span>
            <span
              className={cn(
                'inline-flex items-center justify-center gap-1.5 self-center max-w-full rounded-full bg-black/[0.06] font-normal text-black/80 tracking-wide',
                dashboard ? 'px-2.5 py-1 text-[0.75rem]' : 'px-2 py-0.5 text-[0.6875rem]',
              )}
            >
              <ShiftIcon
                className={cn('shrink-0 opacity-70', dashboard ? 'h-3.5 w-3.5' : 'h-3 w-3')}
                strokeWidth={1.5}
                aria-hidden
              />
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
  dashboard?: boolean;
}

function StatusSection({
  icon,
  title,
  subtitle,
  profiles,
  shifts,
  dateLabel,
  dashboard = false,
}: StatusSectionProps) {
  const coffeeShopStaffCount = countFohCoffeeStaff(profiles, shifts, getClientShiftTypes());

  return (
    <section
      aria-label={title}
      className={cn(
        'rounded-3xl border border-border bg-card bb-shadow-sm',
        dashboard ? 'md:h-full md:min-h-0 md:flex md:flex-col p-5 md:p-5' : 'p-5 md:p-7',
      )}
    >
      <header
        className={cn(
          'flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 shrink-0',
          dashboard ? 'mb-4' : 'mb-6',
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted bb-shadow-sm">
            {icon}
          </div>
          <div className="min-w-0">
            <h2
              className={cn(
                'font-normal text-foreground tracking-tight leading-snug',
                dashboard
                  ? 'text-[1.05rem]'
                  : 'text-[clamp(1rem,2.5vw,1.25rem)]',
              )}
            >
              {title}
            </h2>
            <p
              className={cn(
                'font-normal text-muted-foreground/90 tracking-wide line-clamp-2',
                dashboard ? 'mt-1 text-[0.8rem]' : 'mt-1 text-[0.8rem]',
              )}
            >
              {subtitle}
            </p>
          </div>
        </div>
        <span className="text-[0.7rem] font-normal text-muted-foreground/70 uppercase tracking-[0.2em] shrink-0">
          {coffeeShopStaffCount} พนักงาน
        </span>
      </header>
      <div
        className={cn(
          dashboard &&
            'md:flex-1 md:min-h-0 md:overflow-y-auto bb-smooth-scroll md:pr-0.5 md:flex md:flex-col',
        )}
      >
        <StatusGrid
          profiles={profiles}
          shifts={shifts}
          dateLabel={dateLabel}
          dashboard={dashboard}
        />
      </div>
    </section>
  );
}

export default function LiveStatusTracker({
  initialProfiles,
  initialShifts,
  currentThaiDate,
  initialTomorrowShifts = [],
  tomorrowThaiDate,
  layout = 'default',
}: LiveStatusTrackerProps) {
  const isDashboard = layout === 'dashboard';
  const [profiles, setProfiles] = useState(initialProfiles);
  const [shifts, setShifts] = useState(initialShifts);
  const [tomorrowShifts, setTomorrowShifts] = useState(initialTomorrowShifts);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync profile order when server props refresh
    setProfiles(initialProfiles);
  }, [initialProfiles]);

  const profileDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshShiftPanels = useCallback(async () => {
    const bkkNow = toZonedTime(new Date(), 'Asia/Bangkok');
    const bkkTomorrow = addDays(bkkNow, 1);

    try {
      const [today, tomorrow] = await Promise.all([
        fetchShiftsForBkkDayFromClient(bkkNow),
        fetchShiftsForBkkDayFromClient(bkkTomorrow),
      ]);
      if (today !== null) setShifts(today);
      if (tomorrow !== null) setTomorrowShifts(tomorrow);
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        const supabaseError = error as { message: string; details?: string };
        console.error(
          'Supabase Error (LiveStatusTracker refresh):',
          supabaseError.message,
          supabaseError.details,
        );
      } else {
        console.error('Supabase Error (LiveStatusTracker refresh):', error);
      }
    }
  }, []);

  const { scheduleRefresh, runRefresh } = useDebouncedShiftRefresh({
    onRefresh: refreshShiftPanels,
  });

  const debouncedRefreshProfiles = useCallback(() => {
    if (profileDebounceRef.current) clearTimeout(profileDebounceRef.current);
    profileDebounceRef.current = setTimeout(() => {
      void (async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, schedule_order')
          .order('schedule_order', { ascending: true });
        if (data) setProfiles(data);
      })();
    }, 300);
  }, []);

  useShiftRealtime({
    onShiftsChange: scheduleRefresh,
    onProfilesChange: debouncedRefreshProfiles,
  });

  useEffect(() => {
    runRefresh({ force: true });
  }, [runRefresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        scheduleRefresh();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [scheduleRefresh]);

  useEffect(() => {
    return () => {
      if (profileDebounceRef.current) clearTimeout(profileDebounceRef.current);
    };
  }, []);

  return (
    <div
      className={cn(
        'space-y-6 md:space-y-8',
        isDashboard &&
          'md:space-y-0 md:grid md:grid-cols-2 md:gap-4 md:min-h-0 md:flex-[11] md:shrink md:items-stretch',
      )}
    >
      <StatusSection
        icon={
          <CalendarDays
            className="h-5 w-5 text-muted-foreground"
            strokeWidth={1.5}
          />
        }
        title="สถานะพนักงานวันนี้"
        subtitle={currentThaiDate ?? ''}
        profiles={profiles}
        shifts={shifts}
        dateLabel={currentThaiDate}
        dashboard={isDashboard}
      />

      {tomorrowThaiDate && (
        <StatusSection
          icon={
            <Sun
              className="h-5 w-5 text-muted-foreground"
              strokeWidth={1.5}
            />
          }
          title="กะวันถัดไป"
          subtitle={tomorrowThaiDate}
          profiles={profiles}
          shifts={tomorrowShifts}
          dateLabel={tomorrowThaiDate}
          dashboard={isDashboard}
        />
      )}
    </div>
  );
}
