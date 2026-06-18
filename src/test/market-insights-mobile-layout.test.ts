import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('Market Insights mobile layout — compositor-safe rendering', () => {
  test('MarketInsightsClient should not use AnimatePresence for body state transitions', () => {
    const code = readFile('app/[locale]/market-insights/MarketInsightsClient.tsx');
    expect(code).not.toContain('<AnimatePresence');
    expect(code).not.toContain("bodyView === 'loading'");
  });

  test('MarketInsightsClient should use aria-busy overlay when refreshing with existing content', () => {
    const code = readFile('app/[locale]/market-insights/MarketInsightsClient.tsx');
    expect(code).toMatch(/aria-busy/);
    expect(code).toMatch(/isLoading\s*&&\s*hasLoaded/);
  });

  test('ContextPanel KPI section should use stable auto-height rows on mobile and expand on sm+', () => {
    const code = readFile('app/[locale]/market-insights/components/ContextPanel.tsx');
    expect(code).toMatch(/grid w-full grid-cols-1 auto-rows-min items-start gap-3 sm:grid-cols-2/);
    expect(code).not.toMatch(/contain:paint/);
    expect(code).not.toMatch(/w-full min-w-0 shrink-0 rounded-2xl/);
    expect(code).toMatch(/overflow-hidden/);
  });

  test('MarketInsightsClient refresh overlay should hide underlying content on mobile', () => {
    const code = readFile('app/[locale]/market-insights/MarketInsightsClient.tsx');
    expect(code).toMatch(/absolute inset-0 z-20/);
    expect(code).toMatch(/md:fixed md:inset-0 md:z-40/);
    expect(code).toMatch(/max-md:invisible/);
    expect(code).not.toMatch(/bg-background\/80/);
  });

  test('InsightCharts should use flex-col on mobile and grid on lg+', () => {
    const charts = readFile('app/[locale]/market-insights/components/InsightCharts.tsx');
    const inner = readFile('app/[locale]/market-insights/components/InsightChartsInner.tsx');
    expect(charts).toMatch(/grid w-full grid-cols-1 gap-3 lg:grid-cols-2/);
    expect(inner).toMatch(/grid w-full grid-cols-1 gap-3 lg:grid-cols-2/);
  });

  test('market-insights components should not use stagger x-motion', () => {
    const files = [
      'app/[locale]/market-insights/MarketInsightsClient.tsx',
      'app/[locale]/market-insights/components/AlertsCard.tsx',
      'app/[locale]/market-insights/components/ActionChecklist.tsx',
    ];

    for (const file of files) {
      const code = readFile(file);
      expect(code, `${file} should not contain x: -8 stagger`).not.toMatch(/x:\s*-8/);
    }
  });

  test('bb-card and glass-card should limit transform transition to hover-capable devices', () => {
    const css = readFile('app/[locale]/globals.css');
    expect(css).toMatch(/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)/);

    const bbCardDefault = css.match(/\.bb-card\s*\{([^}]*)\}/)?.[1] ?? '';
    const glassCardDefault = css.match(/\.glass-card\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(bbCardDefault).toMatch(/transition:\s*box-shadow/);
    expect(bbCardDefault).not.toContain('transform');
    expect(glassCardDefault).not.toContain('transform');

    const hoverBlock = css.split('@media (hover: hover) and (pointer: fine)')[1] ?? '';
    expect(hoverBlock).toMatch(/\.bb-card[\s\S]*?transform\s+200ms/);
    expect(hoverBlock).toMatch(/\.glass-card[\s\S]*?transform\s+200ms/);
  });

  test('mobile sidebar header should not use backdrop-blur', () => {
    const code = readFile('components/sidebar/MobileNavHeader.tsx');
    const headerLine = code.split('\n').find((l) => l.includes('md:hidden sticky top-0'));
    expect(headerLine).toBeDefined();
    expect(headerLine).not.toContain('backdrop-blur');
  });
});
