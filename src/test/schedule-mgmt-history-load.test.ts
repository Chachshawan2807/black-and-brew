import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const scheduleClientPath = path.resolve(
  __dirname,
  '../app/[locale]/schedule/ScheduleClient.tsx',
);
const clientShiftQueriesPath = path.resolve(
  __dirname,
  '../lib/schedule/client-shift-queries.ts',
);
const shiftActionsPath = path.resolve(__dirname, '../app/actions/shift-actions.ts');

describe('schedule management history loading', () => {
  const scheduleClientCode = fs.readFileSync(scheduleClientPath, 'utf-8');
  const clientShiftQueriesCode = fs.readFileSync(clientShiftQueriesPath, 'utf-8');
  const shiftActionsCode = fs.readFileSync(shiftActionsPath, 'utf-8');

  test('prefetches management history when schedule client mounts', () => {
    expect(scheduleClientCode).toMatch(
      /useEffect\(\(\) => \{[\s\S]*void fetchMgmtHistory\(\{ reset: true \}\);[\s\S]*\}, \[fetchMgmtHistory\]\);/,
    );
  });

  test('does not clear cached management history before refetching', () => {
    expect(scheduleClientCode).not.toContain('setMgmtHistory([]);');
    expect(scheduleClientCode).not.toMatch(
      /showManagementModal[\s\S]*setMgmtRawShifts\(\[\]\)/,
    );
  });

  test('updates management history progressively after each fetched page', () => {
    const fetchBody = scheduleClientCode.slice(
      scheduleClientCode.indexOf('const fetchMgmtHistory = useCallback'),
      scheduleClientCode.indexOf('const getMgmtHistoryScrollRoot = useCallback'),
    );

    expect(fetchBody).toContain('setMgmtRawShifts(accumulated);');
    expect(fetchBody).toContain('shouldContinueMgmtHistoryPagination');
    expect(fetchBody).toContain('mgmtFetchGenerationRef');
  });

  test('week shift refresh waits for an authenticated client session', () => {
    expect(clientShiftQueriesCode).toContain('ensureSupabaseSession');
    expect(clientShiftQueriesCode).toMatch(/if \(!sessionOk\) \{\s*return null;/);
    expect(scheduleClientCode).toMatch(/if \(data === null\) return;/);
  });

  test('fetchManagementHistoryPage exposes raw batch size for pagination chaining', () => {
    const body = shiftActionsCode.slice(
      shiftActionsCode.indexOf('export async function fetchManagementHistoryPage'),
    );

    expect(body).toContain('rawBatchSize');
  });
});
