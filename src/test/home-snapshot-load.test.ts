import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const compilePath = resolve(
  __dirname,
  '../lib/proactive-insights/compile-operational-snapshot.ts',
);
const slicesPath = resolve(
  __dirname,
  '../lib/secretary/adapters/snapshot-slices.ts',
);

describe('home snapshot load structure', () => {
  test('week schedule loads holidays and the week shift range in one parallel pass', () => {
    const source = readFileSync(compilePath, 'utf-8');
    expect(source).toContain('buildWeekScheduleFromRange');
    expect(source).toContain('getBangkokCalendarDayQueryBounds');
    expect(source).not.toMatch(
      /weekIsos\.map\([\s\S]*fetchTodayShifts/,
    );
  });

  test('bean-order slice reuses one operational snapshot instead of a sequential extra fetch', () => {
    const source = readFileSync(slicesPath, 'utf-8');
    expect(source).not.toMatch(
      /const pendingBeanOrders = await fetchPendingBeanOrdersInsightSlice\(\);\s*const operational = await compileOperationalSnapshot/,
    );
    expect(source).toContain('compileOperationalSnapshot');
  });

  test('schedule slice shares today shifts with the operational snapshot', () => {
    const source = readFileSync(slicesPath, 'utf-8');
    expect(source).toMatch(/const shiftsPromise = fetchTodayShifts/);
    expect(source).toContain('fetchShifts:');
    expect(source).toContain('shiftsPromise');
  });
});
