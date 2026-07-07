import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC_ROOT = path.resolve(__dirname, '..');

function walkTsxTs(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'test') continue;
      files.push(...walkTsxTs(fullPath));
      continue;
    }
    if (/\.(tsx|ts)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('font stack audit', () => {
  test('globals.css uses Prompt-first --font-sans and aliases mono to sans', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/globals.css'),
      'utf-8'
    );

    expect(css).toContain(
      '--font-sans: var(--font-prompt), var(--font-ibm-plex-sans-thai), var(--font-inter), system-ui, sans-serif;'
    );
    expect(css).toContain('--font-mono: var(--font-sans);');
    expect(css).toMatch(/input,\s*\n\s*textarea,\s*\n\s*select,\s*\n\s*button\s*\{[\s\S]*?font-family:\s*inherit;/);
  });

  test('root layout applies app font variables and font-sans', () => {
    const layout = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/layout.tsx'),
      'utf-8'
    );

    expect(layout).toContain('appFontClassName');
    expect(layout).toContain('antialiased');
  });

  test('fonts.ts exports unified stack for charts and embeds font-sans on html', () => {
    const fonts = fs.readFileSync(
      path.resolve(__dirname, '../lib/fonts.ts'),
      'utf-8'
    );

    expect(fonts).toContain('font-sans');
    expect(fonts).toContain('APP_FONT_FAMILY_CSS');
    expect(fonts).toContain('var(--font-prompt), var(--font-ibm-plex-sans-thai), var(--font-inter), system-ui, sans-serif');
  });

  test('no component uses font-mono (system monospace breaks Prompt stack)', () => {
    const offenders: string[] = [];

    for (const file of walkTsxTs(SRC_ROOT)) {
      const source = fs.readFileSync(file, 'utf-8');
      if (source.includes('font-mono')) {
        offenders.push(path.relative(SRC_ROOT, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  test('Recharts axis ticks use getChartAxisTick with app font family', () => {
    const chartTheme = fs.readFileSync(
      path.resolve(__dirname, '../lib/chart-theme.ts'),
      'utf-8'
    );
    const salesChart = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/sales/_components/SalesTopProductsChartInner.tsx'),
      'utf-8'
    );

    expect(chartTheme).toContain('APP_FONT_FAMILY_CSS');
    expect(salesChart).toContain('getChartAxisTick(chartColors.tick)');
  });
});
