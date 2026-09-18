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
  type HomeShiftStatusRow,
} from '@/lib/schedule/home-shift-status';
import { formatCountdownClock } from '@/lib/schedule/shift-work-countdown';
import {
  HomeSectionBadge,
  HomeSectionHeader,
} from '@/app/[locale]/_components/home-section-header';
import { cn } from '@/lib/utils';
import { BB_DATA_CARD } from '@/lib/ui-outlined-tokens';
import type { ClientShiftRow } from '@/lib/schedule/client-shift-queries';
import type { HomeMemberPanelSnapshot } from '@/lib/schedule/load-home-member-panel-server';
import { scheduleIdleWork } from '@/lib/schedule-idle-work';
import { SHIFT_TYPES_UPDATED_EVENT } from '@/lib/shift-type-config';

type HomeShiftStatusSectionProps = {
  dateIso: string;
  /** SSR or entry-path snapshot; skips loading shell when date matches */
  initialPanel?: HomeMemberPanelSnapshot;
  /** Keep right column on desktop when sidebar is collapsed and there are no shifts */
  showWhenEmpty?: boolean;
};

function panelMatchesDate(
  panel: HomeMemberPanelSnapshot | undefined,
  dateIso: string,
): panel is HomeMemberPanelSnapshot {
  return panel?.dateIso === dateIso;
}

function useNowTick(enabled: boolean): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [enabled]);

  return now;
}

const SHIFT_TIME_PILL =
  'inline-flex max-w-full items-center rounded-full border border-black/10 bg-white/60 px-2 py-0.5 text-[10px] font-normal tabular-nums tracking-wide text-black/80';

const SHIFT_DUTY_PILL =
  'inline-flex max-w-full items-center rounded-full border border-black/10 bg-white/60 px-2 py-0.5 text-[10px] font-normal tracking-wide text-black/80';

/** Fixed slots so timed and non-timed cards stay the same height. */
const SHIFT_MIDDLE_SLOT = 'flex h-[1.375rem] shrink-0 items-center';

const SHIFT_STATUS_PANEL =
  'flex h-[2rem] shrink-0 w-full flex-col items-center justify-center rounded-xl border border-black/10 bg-white/55 px-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]';

function ShiftStatusEmployeeCard({
  row,
  countdown,
}: {
  row: HomeShiftStatusRow;
  countdown: ReturnType<typeof resolveTimedShiftCountdownView>;
}) {
  return (
    <article
      aria-label={`${row.fullName} กะ ${row.timedWindowLabel ?? row.shiftLabel}`}
      className={cn(
        row.colorClass,
        'group relative flex w-[8.25rem] shrink-0 flex-col gap-1.5 overflow-hidden rounded-2xl border p-3 bb-shadow-sm ring-1 ring-inset ring-black/[0.04] bb-transition motion-reduce:transition-none hover:bb-shadow-md hover:brightness-[0.99]',
      )}
      style={row.colorStyle}
    >
      <p className="truncate text-[0.8125rem] font-normal leading-snug tracking-tight text-black">
        {row.fullName}
      </p>

      <div className={SHIFT_MIDDLE_SLOT}>
        {row.timedWindowLabel ? (
          <span className={SHIFT_TIME_PILL}>{row.timedWindowLabel}</span>
        ) : (
          <span className={cn(SHIFT_DUTY_PILL, 'truncate')}>{row.shiftLabel}</span>
        )}
      </div>

      <div className={SHIFT_STATUS_PANEL}>
        {countdown ? (
          countdown.phase === 'ended' ? (
            <span className="text-[11px] font-normal leading-none text-black/75">เลิกงานแล้ว</span>
          ) : (
            <span
              className="text-[0.9375rem] font-normal leading-none tabular-nums tracking-tight text-black"
              aria-live="polite"
            >
              {formatCountdownClock(countdown.countdownMs)}
            </span>
          )
        ) : (
          <span
            className="text-[0.9375rem] font-normal leading-none text-black/30 select-none"
            aria-hidden
          >
            —
          </span>
        )}
      </div>
    </article>
  );
}

function ShiftStatusSectionHeader({ staffCount }: { staffCount: number }) {
  return (
    <HomeSectionHeader
      compact
      className="mb-0 border-b border-border/50 pb-3"
      icon={
        <CalendarClock className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} aria-hidden />
      }
      title="สมาชิกวันนี้"
      meta={<HomeSectionBadge className="normal-case tracking-normal">{staffCount} คน</HomeSectionBadge>}
    />
  );
}

export default function HomeShiftStatusSection({
  dateIso,
  initialPanel,
  showWhenEmpty = false,
}: HomeShiftStatusSectionProps) {
  const seedPanel = panelMatchesDate(initialPanel, dateIso) ? initialPanel : undefined;
  const [profiles, setProfiles] = useState<HomeShiftProfile[]>(() => seedPanel?.profiles ?? []);
  const [shifts, setShifts] = useState<ClientShiftRow[]>(() => seedPanel?.shifts ?? []);
  const [loaded, setLoaded] = useState(() => Boolean(seedPanel));
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
    if (panelMatchesDate(initialPanel, dateIso)) {
      setProfiles(initialPanel.profiles);
      setShifts(initialPanel.shifts);
      setLoaded(true);
    } else if (dateIso !== initialPanel?.dateIso) {
      setLoaded(false);
    }
  }, [initialPanel, dateIso]);

  useEffect(() => {
    if (panelMatchesDate(initialPanel, dateIso)) {
      return scheduleIdleWork(() => runRefresh({ force: true }), { timeout: 2000 });
    }
    runRefresh({ force: true });
  }, [runRefresh, dateIso, initialPanel]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') scheduleRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [scheduleRefresh]);

  useEffect(() => {
    const onShiftTypesUpdated = () => scheduleRefresh();
    window.addEventListener(SHIFT_TYPES_UPDATED_EVENT, onShiftTypesUpdated);
    return () => window.removeEventListener(SHIFT_TYPES_UPDATED_EVENT, onShiftTypesUpdated);
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

  if (loaded && rows.length === 0) {
    if (!showWhenEmpty) return null;
    return (
      <section
        aria-label="สมาชิกวันนี้"
        className={cn(BB_DATA_CARD, 'hidden min-w-0 space-y-3 p-3 sm:p-4 md:block')}
      >
        <ShiftStatusSectionHeader staffCount={0} />
        <p className="mt-3 px-1 text-sm text-muted-foreground">ไม่มีกะในวันนี้</p>
      </section>
    );
  }

  return (
    <section aria-label="สมาชิกวันนี้" className={cn(BB_DATA_CARD, 'min-w-0 p-3 sm:p-4')}>
      <ShiftStatusSectionHeader staffCount={rows.length} />

      {!loaded ? (
        <p className="mt-3 px-1 text-sm text-muted-foreground">กำลังโหลดสมาชิกวันนี้...</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {rows.map((row) => {
            const countdown = resolveTimedShiftCountdownView(row, now);
            return (
              <li key={row.profileId}>
                <ShiftStatusEmployeeCard row={row} countdown={countdown} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
