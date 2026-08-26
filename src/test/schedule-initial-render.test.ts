import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const scheduleClientPath = path.resolve(
  __dirname,
  '../app/[locale]/schedule/ScheduleClient.tsx',
);
const schedulePagePath = path.resolve(__dirname, '../app/[locale]/schedule/page.tsx');

describe('schedule initial render reliability', () => {
  const scheduleClientCode = fs.readFileSync(scheduleClientPath, 'utf-8');
  const schedulePageCode = fs.readFileSync(schedulePagePath, 'utf-8');

  test('schedule page keeps a visible loading skeleton while the client chunk loads', () => {
    expect(schedulePageCode).toContain('RouteLoadingSkeleton');
    expect(schedulePageCode).not.toContain('createLazyFeatureClient');
  });

  test('ScheduleClient derives week rows from server week anchor and hydrates on week navigation', () => {
    expect(scheduleClientCode).toContain('getScheduleWeekDays(initialDateStr)');
    expect(scheduleClientCode).toMatch(
      /if \(initialDateStr !== hydratedWeekRef\.current\) \{[\s\S]*setShifts\(initialShifts\)/,
    );
  });

  test('ScheduleClient retries client refresh instead of leaving an empty week behind', () => {
    expect(scheduleClientCode).toContain('scheduleClientRefreshRetry');
    expect(scheduleClientCode).toMatch(/if \(data === null\) \{[\s\S]*scheduleClientRefreshRetry\(\)/);
    expect(scheduleClientCode).toContain('weekHasShiftData(initialShifts');
  });
});
