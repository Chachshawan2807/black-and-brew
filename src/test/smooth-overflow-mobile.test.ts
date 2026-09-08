import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('bb-smooth-scroll mobile overflow utility', () => {
  test('globals.css defines touch momentum scrolling utility', () => {
    const css = readFile('app/[locale]/globals.css');
    expect(css).toMatch(/\.bb-smooth-scroll\s*\{/);
    expect(css).toMatch(/-webkit-overflow-scrolling:\s*touch/);
    expect(css).toMatch(/touch-action:\s*pan-x\s+pan-y/);
    expect(css).toMatch(/min-width:\s*0/);
    expect(css).toMatch(/\.bb-smooth-scroll-chain-y\s*\{/);
    expect(css).toMatch(/overscroll-behavior-y:\s*auto/);
    expect(css).toMatch(/\.bb-sticky-scroll-cell\s*\{/);
  });

  test('globals.css hides nested scrollbars while showing page scrollbar on desktop', () => {
    const css = readFile('app/[locale]/globals.css');
    expect(css).toMatch(/:where\(:not\(html\):not\(body\)\)[\s\S]*scrollbar-width:\s*none/);
    expect(css).toMatch(/:where\(:not\(html\):not\(body\)\)::-webkit-scrollbar[\s\S]*display:\s*none/);
    expect(css).toMatch(/@media \(min-width:\s*768px\)[\s\S]*html[\s\S]*overflow-y:\s*auto/);
    expect(css).toMatch(/@media \(min-width:\s*768px\)[\s\S]*html::-webkit-scrollbar[\s\S]*display:\s*block/);
    expect(css).toMatch(/@media \(min-width:\s*768px\)[\s\S]*body::-webkit-scrollbar[\s\S]*display:\s*block/);
    expect(css).toMatch(/@media \(prefers-contrast:\s*more\)/);
  });

  test('src does not override global scrollbar hide with thin scrollbars', () => {
    const srcRoot = path.resolve(ROOT, 'app');
    const walk = (dir: string): string[] => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      return entries.flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(fullPath);
        if (/\.(tsx?|jsx?)$/.test(entry.name)) return [fullPath];
        return [];
      });
    };

    const offenders = walk(srcRoot).filter((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      return /\[scrollbar-width:|scrollbar-none|scrollbar-hide|scrollbar-thin|custom-scrollbar|\[&::-webkit-scrollbar\]/.test(content);
    });

    expect(offenders).toEqual([]);
  });

  test('MonthlyRoster consolidated table allows vertical scroll chaining from sticky name column', () => {
    const code = readFile('app/[locale]/dashboard/_components/MonthlyRoster.tsx');
    expect(code).toMatch(/overflow-x-auto bb-smooth-scroll bb-smooth-scroll-chain-y/);
    expect(code).toMatch(/sticky left-0[\s\S]*bb-sticky-scroll-cell/);
  });

  test('MonthlyRoster table shell clips square thead corners to rounded border', () => {
    const code = readFile('app/[locale]/dashboard/_components/MonthlyRoster.tsx');
    expect(code).toMatch(
      /bg-card rounded-\[32px\] overflow-hidden border border-border shadow-xl shadow-black\/5/,
    );
  });

  test('MonthlyRoster individual staff select sizes to content instead of stretching', () => {
    const code = readFile('app/[locale]/dashboard/_components/MonthlyRoster.tsx');
    expect(code).toContain('RoundedSelect');
    expect(code).toMatch(/RoundedSelect[\s\S]*?\bw-fit\b/);
    expect(code).not.toMatch(/RoundedSelect[\s\S]*?\bflex-1\b/);
    expect(code).not.toMatch(/RoundedSelect[\s\S]*?\bmax-w-sm\b/);
  });
  const scrollSurfaces: { file: string; pattern: RegExp }[] = [
    {
      file: 'app/[locale]/inventory/_components/InventoryHistoryModal.tsx',
      pattern: /flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-auto[\s\S]*bb-smooth-scroll bb-scroll-xy/,
    },
    {
      file: 'components/notifications/NotificationPanel.tsx',
      pattern: /flex-1 min-h-0 min-w-0 overflow-y-auto[\s\S]*bb-smooth-scroll/,
    },
    {
      file: 'app/[locale]/schedule/ScheduleClient.tsx',
      pattern: /flex-1 min-h-0 min-w-0 overflow-x-auto[\s\S]*overflow-y-auto[\s\S]*bb-smooth-scroll bb-smooth-scroll-chain-y bb-scroll-xy/,
    },
    {
      file: 'app/[locale]/maintenance/MaintenanceClient.tsx',
      pattern: /overflow-x-auto bb-smooth-scroll bb-smooth-scroll-chain-y/,
    },
    {
      file: 'app/[locale]/inventory/_components/InventoryQuickActionBar.tsx',
      pattern: /overflow-y-auto[\s\S]*bb-smooth-scroll/,
    },
    {
      file: 'app/[locale]/inventory/_components/PurchaseOrdersModal.tsx',
      pattern: /flex-1[\s\S]*overflow-auto[\s\S]*bb-smooth-scroll bb-smooth-scroll-chain-y/,
    },
    {
      file: 'app/[locale]/inventory/branch-withdraw/branch-withdraw-layout.ts',
      pattern: /min-h-0 min-w-0 flex-1[\s\S]*overflow-y-auto overscroll-contain bb-smooth-scroll/,
    },
  ];

  for (const { file, pattern } of scrollSurfaces) {
    test(`${file} applies bb-smooth-scroll on scroll containers`, () => {
      const code = readFile(file);
      expect(code).toMatch(pattern);
    });
  }
});
