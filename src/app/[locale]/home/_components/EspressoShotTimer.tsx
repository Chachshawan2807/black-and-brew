'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock3, RotateCcw, X } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { ESPRESSO_SHOT_QUALITY_COLORS } from '@/lib/shift-colors';
import {
  createEspressoShotTimerState,
  ESPRESSO_SHOT_TIMER_STORAGE_KEY,
  formatEspressoShotDuration,
  getEspressoShotQuality,
  readEspressoShotTimerState,
  toggleEspressoShotTimer,
  type EspressoShotSide,
  type EspressoShotSideState,
} from '@/lib/espresso-shot-timer';

type EspressoShotTimerProps = {
  locale: string;
};

const SHOT_QUALITY_CARD_COLORS = {
  target: ESPRESSO_SHOT_QUALITY_COLORS.target,
  fast: ESPRESSO_SHOT_QUALITY_COLORS.fast,
  slow: ESPRESSO_SHOT_QUALITY_COLORS.slow,
} as const;

function getElapsedMs(side: EspressoShotSideState, now: number): number {
  if (side.startedAt !== null) return Math.max(0, now - side.startedAt);
  return side.lastDurationMs ?? 0;
}

const SEVEN_SEGMENT_DIGITS: Record<string, readonly string[]> = {
  '0': ['top', 'upper-left', 'upper-right', 'lower-left', 'lower-right', 'bottom'],
  '1': ['upper-right', 'lower-right'],
  '2': ['top', 'upper-right', 'middle', 'lower-left', 'bottom'],
  '3': ['top', 'upper-right', 'middle', 'lower-right', 'bottom'],
  '4': ['upper-left', 'upper-right', 'middle', 'lower-right'],
  '5': ['top', 'upper-left', 'middle', 'lower-right', 'bottom'],
  '6': ['top', 'upper-left', 'middle', 'lower-left', 'lower-right', 'bottom'],
  '7': ['top', 'upper-right', 'lower-right'],
  '8': ['top', 'upper-left', 'upper-right', 'middle', 'lower-left', 'lower-right', 'bottom'],
  '9': ['top', 'upper-left', 'upper-right', 'middle', 'lower-right', 'bottom'],
};

const SEVEN_SEGMENT_POLYGONS: Record<string, string> = {
  top: '10,2 38,2 34,7 14,7',
  'upper-left': '6,7 11,10 11,31 6,34',
  'upper-right': '42,7 42,34 37,31 37,10',
  middle: '12,36 36,36 39,39 36,42 12,42 9,39',
  'lower-left': '6,44 11,47 11,64 6,69',
  'lower-right': '42,44 42,69 37,64 37,47',
  bottom: '10,71 14,66 34,66 38,71',
};

function DigitalSeconds({
  durationMs,
  className,
  locale,
}: {
  durationMs: number;
  className: string;
  locale: string;
}) {
  const seconds = formatEspressoShotDuration(durationMs);
  const spokenTime = locale.startsWith('th') ? `${seconds} วินาที` : `${seconds} seconds`;

  return (
    <svg
      className={className}
      viewBox="0 0 94 73"
      role="img"
      aria-label={spokenTime}
      shapeRendering="geometricPrecision"
    >
      {seconds.split('').map((digit, digitIndex) => {
        const activeSegments = SEVEN_SEGMENT_DIGITS[digit] ?? [];
        return (
          <g key={`${digit}-${digitIndex}`} transform={`translate(${digitIndex * 48} 0)`}>
            {Object.entries(SEVEN_SEGMENT_POLYGONS).map(([segment, points]) => (
              <polygon
                key={segment}
                points={points}
                fill="currentColor"
                opacity={activeSegments.includes(segment) ? 1 : 0}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function readStoredState(): ReturnType<typeof createEspressoShotTimerState> {
  try {
    return readEspressoShotTimerState(localStorage.getItem(ESPRESSO_SHOT_TIMER_STORAGE_KEY));
  } catch {
    return createEspressoShotTimerState();
  }
}

function ShotSideCard({
  side,
  state,
  now,
  locale,
  onToggle,
}: {
  side: EspressoShotSide;
  state: EspressoShotSideState;
  now: number;
  locale: string;
  onToggle: (side: EspressoShotSide) => void;
}) {
  const isTh = locale.startsWith('th');
  const isRunning = state.startedAt !== null;
  const name = side === 'medium' ? 'MEDIUM' : 'DARK';

  const qualityLabel = (quality: ReturnType<typeof getEspressoShotQuality>) => {
    if (quality === 'target') return isTh ? 'เข้าเป้า' : 'On target';
    if (quality === 'fast') return isTh ? 'เร็วไป' : 'Fast';
    return isTh ? 'ช้าไป' : 'Slow';
  };

  return (
    <section
      className={cn(
        'flex min-h-0 flex-col rounded-2xl border border-border bg-card p-3 bb-shadow-lg sm:p-4',
        isRunning && 'border-foreground/30',
      )}
    >
      <header className="mb-1 flex shrink-0 items-center justify-between gap-3 border-b border-border/70 pb-2.5">
        <h2 className="text-base font-medium tracking-wide text-foreground sm:text-lg">{name}</h2>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/35 px-2.5 py-1 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              isRunning
                ? 'animate-pulse bg-emerald-500 motion-reduce:animate-none'
                : 'bg-muted-foreground/50',
            )}
            aria-hidden="true"
          />
          {isRunning ? (isTh ? 'กำลังสกัด' : 'Extracting') : isTh ? 'พร้อมจับเวลา' : 'Ready'}
        </span>
      </header>

      <button
        type="button"
        onClick={() => onToggle(side)}
        aria-label={
          isRunning
            ? isTh
              ? `หยุดและบันทึกเวลา ${name}`
              : `Stop and save ${name} shot`
            : isTh
              ? `เริ่มจับเวลา ${name}`
              : `Start ${name} shot timer`
        }
        aria-pressed={isRunning}
        className={cn(
          'my-1 flex min-h-24 flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-muted/20 px-3 py-3 text-foreground shadow-inner touch-manipulation transition-transform duration-150 ease-out motion-reduce:transition-none active:scale-[0.995] motion-reduce:active:scale-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isRunning ? 'border-foreground/50 bg-muted/40' : 'hover:bg-muted/35',
        )}
      >
        <DigitalSeconds
          durationMs={getElapsedMs(state, now)}
          className="h-[clamp(4rem,13vw,6rem)] w-auto text-foreground"
          locale={locale}
        />
        <span className="text-sm text-muted-foreground">
          {isRunning
            ? isTh
              ? 'แตะเพื่อหยุดและบันทึก'
              : 'Tap to stop and save'
            : isTh
              ? state.lastDurationMs === null
                ? 'แตะเพื่อเริ่มจับเวลา'
                : 'แตะเพื่อเริ่มช็อตถัดไป'
              : state.lastDurationMs === null
                ? 'Tap to start timer'
                : 'Tap to start the next shot'}
        </span>
      </button>

      <div className="mt-2 flex h-16 shrink-0 items-center justify-center">
        {state.history.length > 0 ? (
          <ol
            className="mx-auto flex w-max max-w-full gap-1.5 overflow-x-auto pb-1"
            aria-label={isTh ? `ประวัติ ${name}` : `${name} history`}
          >
            {state.history.map((shot) => (
              <li
                key={`${shot.sequence}-${shot.completedAt}`}
                className={cn(
                  'flex min-w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5',
                  SHOT_QUALITY_CARD_COLORS[getEspressoShotQuality(side, shot.durationMs)],
                )}
                aria-label={`${isTh ? `ช็อต ${shot.sequence}` : `Shot ${shot.sequence}`}, ${formatEspressoShotDuration(shot.durationMs)}, ${qualityLabel(getEspressoShotQuality(side, shot.durationMs))}`}
              >
                <span className="text-[10px] leading-none text-muted-foreground">
                  #{shot.sequence}
                </span>
                <DigitalSeconds
                  durationMs={shot.durationMs}
                  className="h-4 w-auto text-foreground"
                  locale={locale}
                />
                <span className="text-[9px] leading-none text-muted-foreground">
                  {qualityLabel(getEspressoShotQuality(side, shot.durationMs))}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="flex w-fit items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-center text-xs text-muted-foreground">
            <Clock3 size={14} strokeWidth={1.7} aria-hidden="true" />
            {isTh ? 'ยังไม่มีประวัติ' : 'No shot history yet'}
          </p>
        )}
      </div>
    </section>
  );
}

export function EspressoShotTimer({ locale }: EspressoShotTimerProps) {
  const isTh = locale.startsWith('th');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resetDialogRef = useRef<HTMLDialogElement>(null);
  const stateRef = useRef(createEspressoShotTimerState());
  const [state, setState] = useState(stateRef.current);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [now, setNow] = useState(0);
  const hasActiveTimer = state.medium.startedAt !== null || state.dark.startedAt !== null;

  useEffect(() => {
    const restored = readStoredState();
    stateRef.current = restored;
    setState(restored);
    setNow(Date.now());
    setReady(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && ready && !dialog.open) {
      setNow(Date.now());
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, ready]);

  useEffect(() => {
    const dialog = resetDialogRef.current;
    if (!dialog) return;
    if (confirmResetOpen && !dialog.open) {
      dialog.showModal();
    } else if (!confirmResetOpen && dialog.open) {
      dialog.close();
    }
  }, [confirmResetOpen]);

  useEffect(() => {
    if (!open || !hasActiveTimer) return;
    const updateNow = () => setNow(Date.now());
    updateNow();
    const interval = window.setInterval(updateNow, 100);
    document.addEventListener('visibilitychange', updateNow);
    window.addEventListener('pageshow', updateNow);
    window.addEventListener('focus', updateNow);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', updateNow);
      window.removeEventListener('pageshow', updateNow);
      window.removeEventListener('focus', updateNow);
    };
  }, [hasActiveTimer, open]);

  const toggleSide = useCallback((side: EspressoShotSide) => {
    const next = toggleEspressoShotTimer(stateRef.current, side, Date.now());
    stateRef.current = next;
    setState(next);
    setNow(Date.now());
    try {
      localStorage.setItem(ESPRESSO_SHOT_TIMER_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep the active timer usable when browser storage is unavailable.
    }
  }, []);

  const resetAll = useCallback(() => {
    const next = createEspressoShotTimerState();
    stateRef.current = next;
    setState(next);
    setNow(Date.now());
    try {
      localStorage.setItem(ESPRESSO_SHOT_TIMER_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep the reset applied in memory when browser storage is unavailable.
    }
    setConfirmResetOpen(false);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!ready}
        className={cn(
          'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-[13px] text-foreground touch-manipulation hover:bg-muted/35 disabled:opacity-60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
      >
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/35" aria-hidden>
          <Clock3 size={14} strokeWidth={1.8} />
        </span>
        {isTh ? 'จับเวลาสกัดกาแฟ' : 'Espresso shot timer'}
      </button>

      <dialog
        ref={dialogRef}
        aria-label={isTh ? 'ตัวจับเวลาสกัดกาแฟ' : 'Espresso shot timer'}
        onClose={() => setOpen(false)}
        className="fixed inset-0 m-0 h-[100svh] max-h-none w-screen max-w-none overflow-hidden border-0 bg-background p-0 text-foreground backdrop:bg-black/65"
      >
        <div className="flex h-full min-h-0 flex-col pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:pb-6 sm:pl-6 sm:pr-6 sm:pt-5">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border pb-2.5">
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              aria-label={isTh ? 'รีเซ็ตตัวจับเวลาและประวัติทั้งหมด' : 'Reset all timers and history'}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-red-600 hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-red-400"
            >
              <RotateCcw size={16} strokeWidth={1.75} aria-hidden />
              {isTh ? 'รีเซ็ตทั้งหมด' : 'Reset all'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={isTh ? 'ปิดหน้าต่างจับเวลา' : 'Close shot timer'}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X size={18} strokeWidth={1.75} aria-hidden />
            </button>
          </header>

          <main className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[repeat(2,minmax(14rem,1fr))] gap-2.5 overflow-y-auto overscroll-contain pt-2.5 landscape:grid-cols-2 landscape:grid-rows-1 sm:gap-3 sm:pt-3">
            <ShotSideCard side="medium" state={state.medium} now={now} locale={locale} onToggle={toggleSide} />
            <ShotSideCard side="dark" state={state.dark} now={now} locale={locale} onToggle={toggleSide} />
          </main>
        </div>
      </dialog>

      <dialog
        ref={resetDialogRef}
        onClose={() => setConfirmResetOpen(false)}
        onCancel={() => setConfirmResetOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setConfirmResetOpen(false);
        }}
        aria-labelledby="espresso-shot-reset-title"
        className="fixed left-1/2 top-1/2 m-0 max-h-[calc(100svh-2rem)] w-[min(90vw,24rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-5 text-foreground shadow-xl backdrop:bg-black/55"
      >
        <h2 id="espresso-shot-reset-title" className="text-base font-medium">
          {isTh ? 'รีเซ็ตตัวจับเวลาทั้งหมด?' : 'Reset all timers?'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isTh
            ? 'เวลาที่กำลังจับและประวัติทั้งสองฝั่งจะถูกล้าง'
            : 'This clears active timers and history for both sides.'}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmResetOpen(false)}
            className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isTh ? 'ยกเลิก' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="min-h-11 rounded-xl border border-border bg-muted px-3 text-sm text-red-600 hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-red-400"
          >
            {isTh ? 'รีเซ็ตทั้งหมด' : 'Reset all'}
          </button>
        </div>
      </dialog>
    </>
  );
}
