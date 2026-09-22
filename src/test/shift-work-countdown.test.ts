import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  buildTimedShiftEndInstant,
  buildTimedShiftStartInstant,
  formatCountdownClock,
  formatShiftClockLabel,
  formatTimedShiftWindowLabel,
  parseTimedShiftLabel,
  resolveShiftCountdownPhase,
  shiftClockFromSharedEpoch,
} from '@/lib/schedule/shift-work-countdown';
import { buildHomeShiftStatusRows, resolveTimedShiftCountdownView } from '@/lib/schedule/home-shift-status';

describe('shift-work-countdown', () => {
  test('6:30 shift ends at 15:30 after nine hours', () => {
    const parsed = parseTimedShiftLabel('6:30');
    expect(parsed).toEqual({ hours: 6, minutes: 30 });

    const end = buildTimedShiftEndInstant('2026-09-18', 6, 30);
    expect(formatShiftClockLabel(end)).toBe('15:30');
    expect(formatTimedShiftWindowLabel('6:30', '2026-09-18')).toBe('6:30 - 15:30');
  });

  test('countdown phase tracks before, active, and ended windows', () => {
    const start = buildTimedShiftStartInstant('2026-09-18', 6, 30);
    const end = buildTimedShiftEndInstant('2026-09-18', 6, 30);

    expect(resolveShiftCountdownPhase(new Date('2026-09-18T06:00:00+07:00'), start, end)).toBe(
      'before',
    );
    expect(resolveShiftCountdownPhase(new Date('2026-09-18T10:00:00+07:00'), start, end)).toBe(
      'active',
    );
    expect(resolveShiftCountdownPhase(new Date('2026-09-18T16:00:00+07:00'), start, end)).toBe(
      'ended',
    );
  });

  test('formatCountdownClock renders zero-padded hh:mm:ss', () => {
    expect(formatCountdownClock(3_661_000)).toBe('01:01:01');
  });

  test('shared epoch keeps the first countdown identical on server and client', () => {
    const epoch = Date.parse('2026-09-23T00:29:00+07:00');
    const serverNow = shiftClockFromSharedEpoch(epoch);
    const clientNow = shiftClockFromSharedEpoch(epoch);
    expect(serverNow?.getTime()).toBe(epoch);
    expect(clientNow?.getTime()).toBe(serverNow?.getTime());
    expect(shiftClockFromSharedEpoch(undefined)).toBeNull();
    expect(shiftClockFromSharedEpoch(null)).toBeNull();
  });
});

describe('shift countdown hydration', () => {
  test('the home clock does not sample a fresh Date during the hydration render', () => {
    const root = path.resolve(__dirname, '..');
    const section = fs.readFileSync(
      path.resolve(root, 'app/[locale]/home/_components/HomeShiftStatusSection.tsx'),
      'utf8',
    );
    const page = fs.readFileSync(path.resolve(root, 'app/[locale]/home/page.tsx'), 'utf8');
    expect(section).not.toContain('useState(() => new Date())');
    expect(section).toContain('shiftClockFromSharedEpoch');
    expect(page).toContain('clockEpochMs={Date.now()}');
  });
});

describe('home-shift-status', () => {
  test('includes only employees with working shifts and timed countdown metadata', () => {
    const profiles = [
      { id: 'a', full_name: 'Ann', schedule_order: 1 },
      { id: 'b', full_name: 'Bob', schedule_order: 2 },
      { id: 'c', full_name: 'Cee', schedule_order: 3 },
    ];
    const shifts = [
      {
        id: '1',
        employee_id: 'a',
        start_time: '2026-09-18T00:00:00',
        end_time: '2026-09-18T23:59:59',
        status: 'scheduled',
        metadata: { location: '6:30' },
      },
      {
        id: '2',
        employee_id: 'b',
        start_time: '2026-09-18T00:00:00',
        end_time: '2026-09-18T23:59:59',
        status: 'day_off',
        metadata: { location: 'วันหยุด' },
      },
      {
        id: '3',
        employee_id: 'c',
        start_time: '2026-09-18T00:00:00',
        end_time: '2026-09-18T23:59:59',
        status: 'scheduled',
        metadata: { location: 'ไปสาขา 2' },
      },
    ];

    const rows = buildHomeShiftStatusRows(profiles, shifts, '2026-09-18');
    expect(rows.map((row) => row.profileId)).toEqual(['a']);
    expect(rows[0]?.isTimedShift).toBe(true);

    const timedView = resolveTimedShiftCountdownView(
      rows[0]!,
      new Date('2026-09-18T12:00:00+07:00'),
    );
    expect(timedView?.phase).toBe('active');
    expect(timedView?.endLabel).toBe('15:30');
  });
});
