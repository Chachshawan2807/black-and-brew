import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const scheduleClientPath = path.resolve(
  __dirname,
  '../app/[locale]/schedule/ScheduleClient.tsx',
);
const shiftActionsPath = path.resolve(__dirname, '../app/actions/shift-actions.ts');
const schedulePagePath = path.resolve(__dirname, '../app/[locale]/schedule/page.tsx');

describe('schedule shift persistence across navigation', () => {
  const scheduleClientCode = fs.readFileSync(scheduleClientPath, 'utf-8');
  const shiftActionsCode = fs.readFileSync(shiftActionsPath, 'utf-8');
  const schedulePageCode = fs.readFileSync(schedulePagePath, 'utf-8');

  test('saveShift revalidates schedule paths before returning success', () => {
    const saveShiftBody = shiftActionsCode.slice(
      shiftActionsCode.indexOf('export async function saveShift'),
      shiftActionsCode.indexOf('export async function deleteManagementHistoryRange'),
    );

    expect(saveShiftBody).toMatch(/}\);\s*\n\s*await revalidateAppPaths\(\);/);
    expect(saveShiftBody).toMatch(
      /after\(async \(\) => \{\s*await recordDataChange\([\s\S]*?\}\);\s*\n\s*await revalidateAppPaths\(\);/,
    );
  });

  test('ScheduleClient refreshes week shifts from Supabase and listens to realtime', () => {
    expect(scheduleClientCode).toContain('refreshShiftsForWeek');
    expect(scheduleClientCode).toContain('useShiftRealtime');
    expect(scheduleClientCode).toContain('useDebouncedShiftRefresh');
    expect(scheduleClientCode).toMatch(
      /useShiftRealtime\(\{[\s\S]*scheduleRefresh/,
    );
    expect(scheduleClientCode).toMatch(
      /runRefresh\(\{ force: true \}\)/,
    );
  });

  test('ScheduleClient does not reset shifts from initialShifts on every server prop refresh', () => {
    expect(scheduleClientCode).toMatch(
      /if \(initialDateStr !== hydratedWeekRef\.current\) \{[\s\S]*setShifts\(initialShifts\)/,
    );
    expect(scheduleClientCode).not.toMatch(
      /if \(initialShifts\) \{\s*setShifts\(initialShifts\);\s*\}/,
    );
  });

  test('schedule page opts out of stale RSC caching for shift data', () => {
    expect(schedulePageCode).toMatch(/unstable_noStore|force-dynamic/);
  });
});
