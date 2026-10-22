import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');

describe('Thai interface typography readability', () => {
  test('shared headings and page titles preserve Thai spacing and line height', () => {
    const css = read('app/[locale]/globals.css');
    const headingRules = css.match(/h1, h2, h3, h4, h5, h6\s*\{[^}]+\}/)?.[0] ?? '';
    const pageTitleRules = css.match(/\.bb-page-title\s*\{[^}]+\}/)?.[0] ?? '';
    const largeTitleRules = css.match(/\.bb-page-title-lg\s*\{[^}]+\}/)?.[0] ?? '';
    const compactTitleRules = css.match(/\.bb-page-title-compact\s*\{[^}]+\}/)?.[0] ?? '';

    for (const rule of [headingRules, pageTitleRules, largeTitleRules, compactTitleRules]) {
      expect(rule).toContain('letter-spacing: normal;');
      expect(rule).toContain('line-height: 1.6;');
      expect(rule).not.toContain('-0.025em');
    }
  });

  test('inventory card labels are readable and wrap on narrow screens', () => {
    const source = read('app/[locale]/inventory/InventoryClient.tsx');
    expect(source).not.toContain('text-[9px] text-foreground/45');
    expect(source.match(/text-xs text-muted-foreground[^\n]*text-center[^\n]*whitespace-normal/g)?.length)
      .toBeGreaterThanOrEqual(12);
    expect(source).toContain('grid-cols-3 sm:grid-cols-6');
  });

  test('home shift names, time ranges, and status cues do not use tiny or clipped text', () => {
    const source = read('app/[locale]/home/_components/HomeShiftStatusSection.tsx');
    expect(source).toContain('text-xs font-normal tabular-nums text-black/80');
    expect(source).toContain('whitespace-normal break-words text-xs font-normal leading-snug text-black');
    expect(source).toContain('text-xs font-normal leading-5 text-black/75');
    expect(source).not.toContain("'shrink-0 px-1.5 text-[9px]'");
  });

  test('schedule labels and preset names use readable size and neutral tracking', () => {
    const primitives = read('app/[locale]/schedule/_components/schedule-ui-primitives.tsx');
    const modal = read('app/[locale]/schedule/_components/ShiftSettingsModal.tsx');
    const schedule = read('app/[locale]/schedule/ScheduleClient.tsx');

    expect(primitives).toContain("'text-xs font-normal text-muted-foreground px-0.5 block'");
    expect(modal).toContain('text-xs leading-4 text-muted-foreground');
    expect(schedule).toContain('className="text-xs font-normal text-muted-foreground"');
    expect(schedule).not.toContain('text-[10px] font-normal uppercase tracking-[0.12em] text-muted-foreground');
  });
});
