import { addHours, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { normalizeShiftLocation } from '@/lib/schedule/format-daily-shifts';

export const TIMED_SHIFT_WORK_HOURS = 9;
const BKK = 'Asia/Bangkok';

export type ShiftCountdownPhase = 'before' | 'active' | 'ended';

export function parseTimedShiftLabel(label: string): { hours: number; minutes: number } | null {
  const normalized = normalizeShiftLocation(label);
  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return {
    hours: parseInt(match[1], 10),
    minutes: parseInt(match[2], 10),
  };
}

export function buildTimedShiftStartInstant(dateIso: string, hours: number, minutes: number): Date {
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return parseISO(`${dateIso}T${hh}:${mm}:00+07:00`);
}

export function buildTimedShiftEndInstant(
  dateIso: string,
  hours: number,
  minutes: number,
  workHours: number = TIMED_SHIFT_WORK_HOURS,
): Date {
  return addHours(buildTimedShiftStartInstant(dateIso, hours, minutes), workHours);
}

export function resolveShiftCountdownPhase(now: Date, shiftStart: Date, shiftEnd: Date): ShiftCountdownPhase {
  if (now.getTime() < shiftStart.getTime()) return 'before';
  if (now.getTime() >= shiftEnd.getTime()) return 'ended';
  return 'active';
}

/** Clock instant shared by SSR HTML and the client hydration render. */
export function shiftClockFromSharedEpoch(clockEpochMs: number | null | undefined): Date | null {
  if (clockEpochMs == null || !Number.isFinite(clockEpochMs)) return null;
  return new Date(clockEpochMs);
}

export function formatCountdownClock(totalMs: number): string {
  const clamped = Math.max(0, totalMs);
  const totalSec = Math.floor(clamped / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((part) => String(part).padStart(2, '0')).join(':');
}

export function formatShiftClockLabel(instant: Date): string {
  return formatInTimeZone(instant, BKK, 'HH:mm');
}

/** Display window for timed shifts, e.g. `6:30 - 15:30` (start label + end after 9h). */
export function formatTimedShiftWindowLabel(shiftLabel: string, dateIso: string): string | null {
  const parsed = parseTimedShiftLabel(shiftLabel);
  if (!parsed) return null;
  const startLabel = normalizeShiftLocation(shiftLabel);
  const endLabel = formatShiftClockLabel(
    buildTimedShiftEndInstant(dateIso, parsed.hours, parsed.minutes),
  );
  return `${startLabel} - ${endLabel}`;
}

export function remainingMsUntil(target: Date, now: Date): number {
  return target.getTime() - now.getTime();
}
