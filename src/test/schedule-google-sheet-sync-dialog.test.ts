import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('schedule Google Sheet sync dialogs', () => {
  test('confirm dialog uses centered portal with green sync and red cancel', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/schedule/ScheduleClient.tsx'),
      'utf8',
    );
    const block = source.slice(
      source.indexOf('open={showGoogleSheetSyncConfirm}'),
      source.indexOf('open={googleSheetSyncOutcome'),
    );
    expect(block).toContain('viewportCentered');
    expect(block).toContain('portaled');
    expect(block).toContain('confirmLabel="ซิงค์"');
    expect(block).toContain('cancelAccent="destructive-filled"');
    expect(block).toContain('confirmAccent="success-pastel-green"');
    expect(block).toMatch(
      /ซิงค์ Google Sheet สำหรับสัปดาห์\\n\$\{googleSheetWeekLabel\} เท่านั้น/,
    );
    expect(block).not.toContain('ซิงค์เมื่อกดปุ่มนี้เท่านั้น');
    expect(block).not.toContain('ซิงค์เลย');
  });

  test('outcome uses centered acknowledge dialog instead of page notice', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/schedule/ScheduleClient.tsx'),
      'utf8',
    );
    const executeStart = source.indexOf('const executeSyncGoogleSheet');
    const executeEnd = source.indexOf('const [todayStr', executeStart);
    const executeFn = source.slice(executeStart, executeEnd);
    expect(executeFn).toContain('setGoogleSheetSyncOutcome');
    expect(executeFn).not.toContain('showPageNotice');
    expect(source).toMatch(/open=\{googleSheetSyncOutcome[\s\S]*confirmLabel="รับทราบ"/);
    expect(source).toMatch(/open=\{googleSheetSyncOutcome[\s\S]*hideCancel/);
  });
});