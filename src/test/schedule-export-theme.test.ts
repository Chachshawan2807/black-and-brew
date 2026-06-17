import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('schedule export theme (dark mode PNG)', () => {
  test('globals.css defines unlayered bb-schedule-export-surface with !important tokens', () => {
    const css = readFile('app/[locale]/globals.css');
    expect(css).toMatch(/\/\*[\s\S]*Schedule grid — unlayered[\s\S]*\.bb-schedule-export-surface/);
    expect(css).toMatch(/--foreground:\s*#000000\s*!important/);
    expect(css).toMatch(/\.dark\s+\.bb-schedule-export-surface[\s\S]*--foreground:\s*#000000\s*!important/);
  });

  test('ScheduleClient uses schedule-export-capture helper', () => {
    const code = readFile('app/[locale]/schedule/ScheduleClient.tsx');
    expect(code).toContain('captureScheduleTableAsPng');
    expect(code).toMatch(
      /id="blackandbrew-schedule-table"[^>]*bb-schedule-export-surface|bb-schedule-export-surface[^>]*id="blackandbrew-schedule-table"/,
    );
  });

  test('schedule-export-capture strips dark class before capture', () => {
    const code = readFile('lib/schedule-export-capture.ts');
    expect(code).toContain('withLightDocumentTheme');
    expect(code).toContain('applyScheduleTableCaptureStyles');
    expect(code).toContain("backgroundColor: SCHEDULE_EXPORT_BG");
  });
});
