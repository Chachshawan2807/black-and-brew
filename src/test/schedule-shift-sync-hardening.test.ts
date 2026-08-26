import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const scheduleClientPath = path.resolve(
  __dirname,
  '../app/[locale]/schedule/ScheduleClient.tsx',
);
const liveStatusTrackerPath = path.resolve(
  __dirname,
  '../app/[locale]/_components/LiveStatusTracker.tsx',
);
const shiftActionsPath = path.resolve(__dirname, '../app/actions/shift-actions.ts');

describe('schedule shift sync hardening', () => {
  const scheduleClientCode = fs.readFileSync(scheduleClientPath, 'utf-8');
  const liveStatusTrackerCode = fs.readFileSync(liveStatusTrackerPath, 'utf-8');
  const shiftActionsCode = fs.readFileSync(shiftActionsPath, 'utf-8');

  test('ScheduleClient guards in-flight saves from stale refresh overwrites', () => {
    expect(scheduleClientCode).toContain('useDebouncedShiftRefresh');
    expect(scheduleClientCode).toContain('beginShiftMutation');
    expect(scheduleClientCode).toContain('endShiftMutation');
    expect(scheduleClientCode).toMatch(
      /const handleSave = async[\s\S]*beginShiftMutation\(\)[\s\S]*finally[\s\S]*endShiftMutation\(\{ scheduleRefresh: true \}\)/,
    );
    expect(scheduleClientCode).not.toMatch(
      /const handleSave = async[\s\S]*await refreshShiftsForWeek\(\{ force: true \}\)/,
    );
    expect(scheduleClientCode).toMatch(
      /const handleClear = async[\s\S]*finally[\s\S]*endShiftMutation\(\{ scheduleRefresh: true \}\)/,
    );
    expect(scheduleClientCode).toMatch(
      /useShiftRealtime\(\{[\s\S]*scheduleRefresh/,
    );
  });

  test('LiveStatusTracker refetches shifts on mount instead of trusting stale props', () => {
    expect(liveStatusTrackerCode).toContain('fetchShiftsForBkkDayFromClient');
    expect(liveStatusTrackerCode).toMatch(/runRefresh\(\{ force: true \}\)/);
    expect(liveStatusTrackerCode).not.toMatch(/setShifts\(initialShifts\)/);
    expect(liveStatusTrackerCode).not.toMatch(/setTomorrowShifts\(initialTomorrowShifts\)/);
  });

  test('shift mutations revalidate the home page schedule panel', () => {
    expect(shiftActionsCode).toMatch(
      /revalidatePath\('\/\[locale\]',\s*'page'\)/,
    );
  });
});
