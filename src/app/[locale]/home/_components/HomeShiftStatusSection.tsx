'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock } from '@/lib/icons';
import { supabase } from '@/lib/supabase';
import { useShiftRealtime } from '@/hooks/use-shift-realtime';
import { useDebouncedShiftRefresh } from '@/hooks/useDebouncedShiftRefresh';
import { fetchShiftsForDateIsoFromClient } from '@/lib/schedule/client-shift-queries';
import {
  buildHomeShiftStatusRows,
  resolveTimedShiftCountdownView,
  type HomeShiftProfile,
} from '@/lib/schedule/home-shift-status';
import { formatCountdownClock } from '@/lib/schedule/shift-work-countdown';
import { HomeSectionHeader } from '@/app/[locale]/_components/home-section-header';
import { cn } from '@/lib/utils';
import { BB_DATA_CARD } from '@/lib/ui-outlined-tokens';
import type { ClientShiftRow } from '@/lib/schedule/client-shift-queries';

type HomeShiftStatusSectionProps = {
  dateIso: string;
};

function useNowTick(enabled: boolean): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [enabled]);

  return now;
}

/** Reserved so timed and non-timed shift cards share the same height. */
const SHIFT_COUNTDOWN_SLOT = 'flex min-h-[1.375rem] items-center justify-center';

export default function HomeShiftStatusSection({ dateIso }: HomeShiftStatusSectionProps) {
  const [profiles, setProfiles] = useState<HomeShiftProfile[]>([]);
  const [shifts, setShifts] = useState<ClientShiftRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const profileDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPanels = useCallback(async () => {
    try {
      const [shiftRows, profileResult] = await Promise.all([
        fetchShiftsForDateIsoFromClient(dateIso),
        supabase
          .from('profiles')
          .select('id, full_name, schedule_order')
          .order('schedule_order', { ascending: true }),
      ]);

      if (shiftRows !== null) setShifts(shiftRows);
      if (profileResult.data) setProfiles(profileResult.data as HomeShiftProfile[]);
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error) {
        const supabaseError = error as { message: string; details?: string };
        console.error(
          'Supabase Error (HomeShiftStatusSection refresh):',
          supabaseError.message,
          supabaseError.details,
        );
      } else {
        console.error('Supabase Error (HomeShiftStatusSection refresh):', error);
      }
    } finally {
      setLoaded(true);
    }
  }, [dateIso]);

  const { scheduleRefresh, runRefresh } = useDebouncedShiftRefresh({
    onRefresh: refreshPanels,
  });

  const debouncedRefreshProfiles = useCallback(() => {
    if (profileDebounceRef.current) clearTimeout(profileDebounceRef.current);
    profileDebounceRef.current = setTimeout(() => {
      void (async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, schedule_order')
          .order('schedule_order', { ascending: true });
        if (data) setProfiles(data as HomeShiftProfile[]);
      })();
    }, 300);
  }, []);

  useShiftRealtime({
    onShiftsChange: scheduleRefresh,
    onProfilesChange: debouncedRefreshProfiles,
  });

  useEffect(() => {
    runRefresh({ force: true });
  }, [runRefresh, dateIso]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') scheduleRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [scheduleRefresh]);

  useEffect(() => {
    return () => {
      if (profileDebounceRef.current) clearTimeout(profileDebounceRef.current);
    };
  }, []);

  const rows = useMemo(
    () => buildHomeShiftStatusRows(profiles, shifts, dateIso),
    [profiles, shifts, dateIso],
  );

  const hasTimedShift = rows.some((row) => row.isTimedShift);
  const now = useNowTick(hasTimedShift);

  if (loaded && rows.length === 0) return null;

  return (
    <section aria-label="สถานะกะงาน" className={cn(BB_DATA_CARD, 'p-3 sm:p-4 space-y-3')}>
      <HomeSectionHeader
        compact
        icon={
          <CalendarClock className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        }
        title="สถานะกะงาน"
        subtitle="พนักงานที่มีกะในวันนี้"
        meta={`${rows.length} คน`}
      />

      {!loaded ? (
        <p className="text-sm text-muted-foreground px-1">กำลังโหลดสถานะกะ...</p>
      ) : (
        <ul className="flex flex-wrap gap-2.5">
          {rows.map((row) => {
            const countdown = resolveTimedShiftCountdownView(row, now);
            return (
              <li key={row.profileId}>
                <article
                  aria-label={`${row.fullName} กะ ${row.timedWindowLabel ?? row.shiftLabel}`}
                  className={cn(
                    row.colorClass,
                    'flex w-[8.25rem] shrink-0 flex-col gap-1.5 rounded-2xl border p-3 bb-shadow-sm ring-1 ring-black/5 bb-transition hover:-translate-y-0.5 touch-manipulation',
                  )}
                  style={row.colorStyle}
                >
                  <p className="truncate text-[0.8125rem] font-normal leading-snug text-black">
                    {row.fullName}
                  </p>

                  <p
                    className={cn(
                      'min-h-[1rem] truncate text-[11px] text-black/75',
                      row.timedWindowLabel && 'font-normal tabular-nums tracking-wide',
                    )}
                  >
                    {row.timedWindowLabel ?? row.shiftLabel}
                  </p>

                  <div className={SHIFT_COUNTDOWN_SLOT} aria-hidden={!countdown}>
                    {countdown ? (
                      countdown.phase === 'ended' ? (
                        <span className="text-[11px] text-black/70">เลิกงานแล้ว</span>
                      ) : (
                        <span
                          className="text-[0.9375rem] font-normal tabular-nums tracking-tight text-black"
                          aria-live="polite"
                        >
                          {formatCountdownClock(countdown.countdownMs)}
                        </span>
                      )
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
