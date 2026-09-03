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
    expect(code).toContain('cacheBust: false');
    expect(code).toContain('toBlob');
    expect(code).toContain('downloadPngBlob');
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
    expect(grid).toContain("SCHEDULE_NAME_COLUMN_MIN = '112px'");
    expect(grid).toContain('SCHEDULE_EXPORT_GRID_TEMPLATE');
    expect(code).toContain('bb-schedule-name-cell');
    expect(grid).toContain('SCHEDULE_DAY_COLUMN_MIN');
    expect(css).toContain('bb-schedule-crosshair-cell');
    expect(css).toContain('bb-schedule-crosshair-row-band');
    expect(code).toContain('bb-schedule-grid');
    expect(code).toContain('bb-schedule-nowrap');
    expect(code).toContain('whitespace-nowrap');
    expect(code).not.toContain('grid grid-cols-8 border-b border-border hover:bg-muted/30');
    expect(code).not.toContain('text-foreground truncate leading');
  });

  test('ScheduleClient clears grid focus before schedule PNG export', () => {
    const code = readFile('app/[locale]/schedule/ScheduleClient.tsx');
    expect(code).toContain('bb-schedule-drag-handle');
    expect(code).toMatch(/setGridFocus\(null\)[\s\S]*captureScheduleTableAsPng|flushSync[\s\S]*setGridFocus\(null\)[\s\S]*captureScheduleTableAsPng/);
  });

  test('schedule export hides drag handles during capture', () => {
    const code = readFile('lib/schedule-export-capture.ts');
    expect(code).toContain('bb-schedule-drag-handle');
    expect(code).toContain('bb-schedule-mgmt-indicator');
    expect(code).toContain('bb-schedule-export-capturing');
    expect(code).toContain("setInline(restores, node, 'display', 'none')");
  });

  test('export supports multi-line public holiday labels', () => {
    const grid = readFile('lib/schedule/grid-layout.ts');
    const code = readFile('lib/schedule-export-capture.ts');
    expect(grid).toContain('SCHEDULE_EXPORT_HOLIDAY_LINE_CLAMP = 4');
    expect(grid).toContain('SCHEDULE_EXPORT_HOLIDAY_MIN_HEIGHT');
    expect(code).toContain('bb-schedule-holiday-label');
    expect(code).toContain('applyScheduleExportRowDividers');
  });

  test('schedule export preserves nowrap schedule layout', () => {
    const code = readFile('lib/schedule-export-capture.ts');
    expect(code).toContain('bb-schedule-grid');
    expect(code).toContain('bb-schedule-holiday-cell');
    expect(code).toContain('SCHEDULE_EXPORT_HOLIDAY_LINE_CLAMP');
    expect(code).toContain('SCHEDULE_EXPORT_GRID_TEMPLATE');
    expect(code).toContain('bb-schedule-nowrap');
    expect(code).toContain('grid-template-columns');
    expect(code).toContain('white-space');
    expect(code).toContain('nowrap');
  });

  test('schedule export uses the same app font stack as the website', () => {
    const code = readFile('lib/schedule-export-capture.ts');
    expect(code).toContain("import { APP_FONT_FAMILY_CSS } from '@/lib/fonts'");
    expect(code).toContain('resolveScheduleExportFontFamily');
    expect(code).toContain("setInline(restores, root, 'font-family'");
    expect(code).toContain('skipFonts: false');
    expect(code).toContain('fontEmbedCSS');
    expect(code).toContain('preferredFontFormat');
  });

  test('MonthlyRoster save-as-image is limited to individual tab', () => {
    const code = readFile('app/[locale]/dashboard/_components/MonthlyRoster.tsx');
    expect(code).toContain('บันทึกเป็นรูปภาพ');
    expect(code).toContain('activeTab === \'individual\'');
    expect(code).toContain('blackandbrew-roster-export');
    expect(code).not.toContain('bb-schedule-export-surface');
    expect(code).toContain('captureRosterAsPng');
    expect(code).toContain('พนักงาน:');
    expect(code).toContain('bg-card h-20');
    expect(code).not.toContain('bg-muted/30 rounded-xl sm:rounded-3xl');
  });

  test('MonthlyRoster table keeps name column compact', () => {
    const code = readFile('app/[locale]/dashboard/_components/MonthlyRoster.tsx');
    expect(code).toContain('whitespace-nowrap w-max');
    expect(code).not.toContain('min-w-[9.5rem]');
    expect(code).toContain('min-w-[6.5rem]');
    expect(code).toContain('whitespace-nowrap');
  });

  test('MonthlyRoster sticky name cells use adequate padding for mobile readability', () => {
    const code = readFile('app/[locale]/dashboard/_components/MonthlyRoster.tsx');
    const stickyCells = [...code.matchAll(/sticky left-0[^"]*bb-sticky-scroll-cell/g)];
    expect(stickyCells.length).toBeGreaterThanOrEqual(2);
    for (const match of stickyCells) {
      expect(match[0]).toMatch(/py-3/);
      expect(match[0]).not.toMatch(/py-2\b/);
    }
  });

  test('InventoryHistoryModal uses bidirectional iOS scroll class', () => {
    const code = readFile('app/[locale]/inventory/_components/InventoryHistoryModal.tsx');
    expect(code).toMatch(/bb-smooth-scroll bb-scroll-xy/);
  });

  test('globals.css scales schedule table on Android mobile to match iOS', () => {
    const css = readFile('app/[locale]/globals.css');
    expect(css).toContain('bb-pwa-android');
    expect(css).toMatch(/html\.bb-pwa-android[\s\S]*#blackandbrew-schedule-table[\s\S]*zoom:\s*0\.72/);
    expect(css).toMatch(/bb-schedule-export-capturing#blackandbrew-schedule-table[\s\S]*zoom:\s*1/);
    expect(css).toMatch(/Android mobile scale schedule to match iOS visual size/);
  });

  test('ScheduleToolbar exposes compact Android toolbar hook class', () => {
    const toolbar = readFile('app/[locale]/schedule/_components/ScheduleToolbar.tsx');
    expect(toolbar).toContain('bb-schedule-toolbar');
    const css = readFile('app/[locale]/globals.css');
    expect(css).toMatch(/html\.bb-pwa-android \.bb-schedule-toolbar button[\s\S]*height:\s*2\.25rem/);
  });

  test('ScheduleToolbar lists export image before settings in action row', () => {
    const toolbar = readFile('app/[locale]/schedule/_components/ScheduleToolbar.tsx');
    const exportIdx = toolbar.indexOf('บันทึกรูปภาพ');
    const settingsIdx = toolbar.indexOf('ตั้งค่า');
    expect(exportIdx).toBeGreaterThan(-1);
    expect(settingsIdx).toBeGreaterThan(-1);
    expect(exportIdx).toBeLessThan(settingsIdx);
  });

  test('ScheduleToolbar hides horizontal scrollbar on mobile action row', () => {
    const toolbar = readFile('app/[locale]/schedule/_components/ScheduleToolbar.tsx');
    expect(toolbar).toMatch(/overflow-x-auto[\s\S]*scrollbar-none/);
    expect(toolbar).toMatch(/\[scrollbar-width:none\]/);
    expect(toolbar).toMatch(/\[&::-webkit-scrollbar\]:hidden/);
  });
});
