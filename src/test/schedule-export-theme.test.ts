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
    expect(css).toMatch(/\/\*[\s\S]*Schedule grid unlayered[\s\S]*\.bb-schedule-export-surface/);
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

  test('globals.css defines roster export surface matching bg-card token', () => {
    const css = readFile('app/[locale]/globals.css');
    expect(css).toMatch(/\.bb-roster-export-surface[\s\S]*--card:\s*#faf9f2\s*!important/);
    expect(css).toMatch(/\.bb-roster-export-surface[\s\S]*background-color:\s*#faf9f2\s*!important/);
  });

  test('globals.css trims roster export bottom padding during capture', () => {
    const css = readFile('app/[locale]/globals.css');
    expect(css).toContain('.bb-roster-export-capturing .bb-roster-export-staff');
    expect(css).toContain('.bb-roster-export-capturing .bb-roster-export-period');
    expect(css).toContain('.bb-roster-export-capturing .bb-roster-export-grid');
    expect(css).toMatch(/\.bb-roster-export-capturing \.bb-roster-export-grid[\s\S]*padding-bottom:\s*0\s*!important/);
    expect(css).toMatch(/\.bb-roster-export-capturing[\s\S]*width:\s*840px\s*!important/);
    expect(css).toMatch(/\.bb-roster-export-capturing \.bb-roster-export-grid[\s\S]*grid-template-columns:\s*repeat\(7,\s*104px\)\s*!important/);
    expect(css).toMatch(/\.bb-roster-export-capturing \.bb-roster-export-grid > div:nth-child\(n\+8\)[\s\S]*height:\s*144px\s*!important/);
  });

  test('globals.css maps muted surfaces inside bb-schedule-export-surface for PNG export', () => {
    const css = readFile('app/[locale]/globals.css');
    expect(css).toMatch(
      /\.bb-schedule-export-surface :where\(\.bg-muted, \[class~='bg-muted\/50'\], \[class~='bg-muted\/80'\]\)[\s\S]*background-color:\s*rgb\(0 0 0 \/ 0\.04\)\s*!important/,
    );
    expect(css).not.toMatch(/:where\(\[class\*='bg-muted'\]\)/);
  });

  test('globals.css keeps schedule drag handles transparent (no false bg-muted match)', () => {
    const css = readFile('app/[locale]/globals.css');
    expect(css).toMatch(
      /\.bb-schedule-export-surface \.bb-schedule-drag-handle[\s\S]*background-color:\s*transparent\s*!important/,
    );
    const schedule = readFile('app/[locale]/schedule/ScheduleClient.tsx');
    const dragHandleLine = schedule
      .split('\n')
      .find((line) => line.includes('bb-schedule-drag-handle') && line.includes('className'));
    expect(dragHandleLine).toBeDefined();
    expect(dragHandleLine).toContain('bg-transparent');
    expect(dragHandleLine).not.toContain('hover:bg-muted/30');
  });

  test('schedule-export-capture strips dark class before capture', () => {
    const code = readFile('lib/schedule-export-capture.ts');
    expect(code).toContain('withLightDocumentTheme');
    expect(code).toContain('applyScheduleTableCaptureStyles');
    expect(code).toContain("backgroundColor: SCHEDULE_EXPORT_BG");
  });

  test('roster-export-capture applies desktop layout styles during mobile PNG export', () => {
    const code = readFile('lib/roster-export-capture.ts');
    expect(code).toContain('applyRosterCaptureStyles');
    expect(code).toContain('mountRosterExportClone');
    expect(code).toContain('ROSTER_EXPORT_ROOT_WIDTH');
    expect(code).toContain('computeRosterExportGridHeight');
  });
});
