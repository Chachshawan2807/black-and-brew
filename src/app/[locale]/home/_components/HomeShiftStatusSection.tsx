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
import {
  formatCountdownClock,
  shiftClockFromSharedEpoch,
} from '@/lib/schedule/shift-work-countdown';
import {
  HomeSectionBadge,
  HomeSectionHeader,
} from '@/app/[locale]/_components/home-section-header';
import { cn } from '@/lib/utils';
import { BB_DATA_CARD } from '@/lib/ui-outlined-tokens';
import type { ClientShiftRow } from '@/lib/schedule/client-shift-queries';
import { addCalendarDaysIsoBkk } from '@/lib/schedule/bkk-calendar-date';
import type { HomeMemberPanelSnapshot } from '@/lib/schedule/home-member-panel';
import { scheduleIdleWork } from '@/lib/schedule-idle-work';
import { SHIFT_TYPES_UPDATED_EVENT } from '@/lib/shift-type-config';

type HomeShiftStatusSectionProps = {
  dateIso: string;
  /** SSR or entry-path snapshot; skips loading shell when date matches */
  initialPanel?: HomeMemberPanelSnapshot;
  /** Keep right column on desktop when sidebar is collapsed and there are no shifts */
  showWhenEmpty?: boolean;
  /** Server render instant so the first countdown matches the HTML */
  clockEpochMs?: number;
};

function panelMatchesDate(
  panel: HomeMemberPanelSnapshot | undefined,
  dateIso: string,
): panel is HomeMemberPanelSnapshot {
  return panel?.dateIso === dateIso;
}

function useNowTick(enabled: boolean, clockEpochMs?: number): Date | null {
  const [now, setNow] = useState<Date | null>(() =>
    enabled ? shiftClockFromSharedEpoch(clockEpochMs) : null,
  );

  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 1000);
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

function ShiftStatusSectionHeader({
  title,
  staffCount,
  className,
}: {
  title: string;
  staffCount: number;
  className?: string;
}) {
  return (
    <HomeSectionHeader
      compact
      className={cn('mb-0 border-b border-border/50 pb-3', className)}
      icon={
        <CalendarClock className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} aria-hidden />
      }
      title={title}
      meta={<HomeSectionBadge className="normal-case tracking-normal">{staffCount} คน</HomeSectionBadge>}
    />
  );
}

function ShiftStatusMemberGrid({
  rows,
  now,
}: {
  rows: HomeShiftStatusRow[];
  now: Date | null;
}) {
  if (rows.length === 0) {
    return <p className="mt-3 px-1 text-sm text-muted-foreground">ไม่มีกะในวันนี้</p>;
  }

  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {rows.map((row) => {
        const countdown = now ? resolveTimedShiftCountdownView(row, now) : null;
        return (
          <li key={row.profileId}>
            <ShiftStatusEmployeeCard row={row} countdown={countdown} />
          </li>
        );
      })}
    </ul>
  );
}

export default function HomeShiftStatusSection({
  dateIso,
  initialPanel,
  showWhenEmpty = false,
  clockEpochMs,
}: HomeShiftStatusSectionProps) {
  const seedPanel = panelMatchesDate(initialPanel, dateIso) ? initialPanel : undefined;
  const tomorrowDateIso = useMemo(() => addCalendarDaysIsoBkk(dateIso, 1), [dateIso]);
  const [profiles, setProfiles] = useState<HomeShiftProfile[]>(() => seedPanel?.profiles ?? []);
  const [shifts, setShifts] = useState<ClientShiftRow[]>(() => seedPanel?.shifts ?? []);
  const [tomorrowShifts, setTomorrowShifts] = useState<ClientShiftRow[]>(
    () => seedPanel?.tomorrowShifts ?? [],
  );
  const [loaded, setLoaded] = useState(() => Boolean(seedPanel));
  const profileDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPanels = useCallback(async () => {
    try {
      const [shiftRows, tomorrowShiftRows, profileResult] = await Promise.all([
        fetchShiftsForDateIsoFromClient(dateIso),
        fetchShiftsForDateIsoFromClient(tomorrowDateIso),
        supabase
          .from('profiles')
          .select('id, full_name, schedule_order')
          .order('schedule_order', { ascending: true }),
      ]);

      if (shiftRows !== null) setShifts(shiftRows);
      if (tomorrowShiftRows !== null) setTomorrowShifts(tomorrowShiftRows);
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
  }, [dateIso, tomorrowDateIso]);

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

  const todayRows = useMemo(
    () => buildHomeShiftStatusRows(profiles, shifts, dateIso),
    [profiles, shifts, dateIso],
  );
  const tomorrowRows = useMemo(
    () => buildHomeShiftStatusRows(profiles, tomorrowShifts, tomorrowDateIso),
    [profiles, tomorrowDateIso, tomorrowShifts],
  );

  const hasTimedShift =
    todayRows.some((row) => row.isTimedShift) || tomorrowRows.some((row) => row.isTimedShift);
  const now = useNowTick(hasTimedShift, clockEpochMs);

  const hasAnyMembers = todayRows.length > 0 || tomorrowRows.length > 0;

  if (loaded && !hasAnyMembers) {
    if (!showWhenEmpty) return null;
    return (
      <section
        aria-label="สมาชิกวันนี้และพรุ่งนี้"
        className={cn(BB_DATA_CARD, 'hidden min-w-0 space-y-5 p-3 sm:p-4 md:block')}
      >
        <div>
          <ShiftStatusSectionHeader title="สมาชิกวันนี้" staffCount={0} />
          <p className="mt-3 px-1 text-sm text-muted-foreground">ไม่มีกะในวันนี้</p>
        </div>
        <div>
          <ShiftStatusSectionHeader title="สมาชิกพรุ่งนี้" staffCount={0} />
          <p className="mt-3 px-1 text-sm text-muted-foreground">ไม่มีกะในวันพรุ่งนี้</p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="สมาชิกวันนี้และพรุ่งนี้"
      className={cn(BB_DATA_CARD, 'min-w-0 space-y-5 p-3 sm:p-4')}
    >
      <div>
        <ShiftStatusSectionHeader title="สมาชิกวันนี้" staffCount={todayRows.length} />
        {!loaded ? (
          <p className="mt-3 px-1 text-sm text-muted-foreground">กำลังโหลดสมาชิกวันนี้...</p>
        ) : (
          <ShiftStatusMemberGrid rows={todayRows} now={now} />
        )}
      </div>

      {loaded ? (
        <div>
          <ShiftStatusSectionHeader title="สมาชิกพรุ่งนี้" staffCount={tomorrowRows.length} />
          {tomorrowRows.length === 0 ? (
            <p className="mt-3 px-1 text-sm text-muted-foreground">ไม่มีกะในวันพรุ่งนี้</p>
          ) : (
            <ShiftStatusMemberGrid rows={tomorrowRows} now={now} />
          )}
        </div>
      ) : null}
    </section>
  );
}
