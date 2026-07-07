import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('iOS scroll & export fixes', () => {
  test('globals.css defines iOS-only scroll overrides', () => {
    const css = readFile('app/[locale]/globals.css');
    expect(css).toMatch(/@supports\s*\(-webkit-touch-callout:\s*none\)/);
    expect(css).toMatch(/\.bb-ios-scroll-host/);
    expect(css).toMatch(/\.bb-scroll-xy/);
    expect(css).toMatch(/overscroll-behavior:\s*auto/);
  });

  test('bb-smooth-scroll allows flex children to shrink for overflow', () => {
    const css = readFile('app/[locale]/globals.css');
    expect(css).toMatch(/\.bb-smooth-scroll\s*\{[\s\S]*min-width:\s*0/);
  });

  test('capture-element-png exports full scroll dimensions', () => {
    const code = readFile('lib/capture-element-png.ts');
    expect(code).toContain('scrollWidth');
    expect(code).toContain('scrollHeight');
    expect(code).toContain('maxHeight');
    expect(code).toContain('export async function captureElementAsPng');
  });

  test('ScheduleClient uses iOS scroll host and shared export helper', () => {
    const code = readFile('app/[locale]/schedule/ScheduleClient.tsx');
    expect(code).toContain('bb-ios-scroll-host');
    expect(code).toContain('bb-scroll-xy');
    expect(code).toContain('captureScheduleTableAsPng');
    expect(code).not.toMatch(/const\s*\{\s*toPng\s*\}\s*=\s*await\s+import\('html-to-image'\)/);
  });

  test('ScheduleClient keeps employee and shift text on one line', () => {
    const code = readFile('app/[locale]/schedule/ScheduleClient.tsx');
    const grid = readFile('lib/schedule/grid-layout.ts');
    const css = readFile('app/[locale]/globals.css');
    expect(code).toContain('SCHEDULE_GRID_TEMPLATE');
    expect(code).toContain('gridFocus');
    expect(code).toContain('onPointerLeave={handleGridPointerLeave}');
    expect(code).toContain('setGridFocus(null)');
    expect(code).toContain('scheduleCrosshairCellClass');
    expect(grid).toContain("SCHEDULE_NAME_COLUMN_MIN = '168px'");
    expect(grid).toContain('SCHEDULE_DAY_COLUMN_MIN');
    expect(css).toContain('bb-schedule-crosshair-cell');
    expect(css).toContain('bb-schedule-crosshair-row-band');
    expect(code).toContain('bb-schedule-grid');
    expect(code).toContain('bb-schedule-nowrap');
    expect(code).toContain('whitespace-nowrap');
    expect(code).not.toContain('grid grid-cols-8 border-b border-border hover:bg-muted/30');
    expect(code).not.toContain('text-foreground truncate leading');
  });

  test('schedule export preserves nowrap schedule layout', () => {
    const code = readFile('lib/schedule-export-capture.ts');
    expect(code).toContain('bb-schedule-grid');
    expect(code).toContain('bb-schedule-nowrap');
    expect(code).toContain('grid-template-columns');
    expect(code).toContain('white-space');
    expect(code).toContain('nowrap');
  });

  test('schedule export uses the same app font stack as the website', () => {
    const code = readFile('lib/schedule-export-capture.ts');
    expect(code).toContain("import { APP_FONT_FAMILY_CSS } from '@/lib/fonts'");
    expect(code).toContain('resolveScheduleExportFontFamily');
    expect(code).toContain('document.fonts.ready');
    expect(code).toContain("setInline(restores, node, 'font-family'");
    expect(code).toContain('skipFonts: false');
  });

  test('MonthlyRoster table keeps name column compact', () => {
    const code = readFile('app/[locale]/dashboard/_components/MonthlyRoster.tsx');
    expect(code).toContain('whitespace-nowrap w-max');
    expect(code).not.toContain('min-w-[9.5rem]');
    expect(code).toContain('min-w-[6.5rem]');
    expect(code).toContain('whitespace-nowrap');
  });

  test('InventoryHistoryModal uses bidirectional iOS scroll class', () => {
    const code = readFile('app/[locale]/inventory/_components/InventoryHistoryModal.tsx');
    expect(code).toMatch(/bb-smooth-scroll bb-scroll-xy/);
  });
});
