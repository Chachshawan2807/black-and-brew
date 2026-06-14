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

  test('ContextPanel KPI grid should use paint containment', () => {
    const code = readFile('app/[locale]/market-insights/components/ContextPanel.tsx');
    expect(code).toMatch(/isolate/);
    expect(code).toMatch(/contain:paint/);
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
    const code = readFile('components/sidebar/SidebarLayout.tsx');
    const headerLine = code.split('\n').find((l) => l.includes('md:hidden sticky top-0'));
    expect(headerLine).toBeDefined();
    expect(headerLine).not.toContain('backdrop-blur');
  });
});
