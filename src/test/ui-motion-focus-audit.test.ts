import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

const MAIN_FEATURE_FILES = [
  'app/[locale]/inventory/InventoryClient.tsx',
  'app/[locale]/inventory/_components/InventoryQuickActionBar.tsx',
  'app/[locale]/inventory/_components/InventoryAddItemModal.tsx',
  'app/[locale]/inventory/_components/InventoryHistoryModal.tsx',
  'app/[locale]/inventory/_components/InventoryGridSearchBar.tsx',
  'app/[locale]/inventory/count/InventoryCountClient.tsx',
  'app/[locale]/schedule/ScheduleClient.tsx',
  'app/[locale]/schedule/_components/ShiftSettingsModal.tsx',
  'app/[locale]/schedule/_components/ScheduleToolbar.tsx',
  'app/[locale]/sales/SalesClient.tsx',
  'app/[locale]/maintenance/MaintenanceClient.tsx',
  'app/[locale]/maintenance/_components/MaintenanceModals.tsx',
  'components/ui/dropdown-menu.tsx',
];

describe('ui motion + focus-visible contract', () => {
  test('globals.css exposes bb-transition and focus-visible input utilities', () => {
    const css = readFile('app/[locale]/globals.css');

    expect(css).toContain('.bb-transition');
    expect(css).toMatch(/transition-property:/);
    expect(css).not.toMatch(/\.bb-transition\s*\{[^}]*transition:\s*all/s);
    expect(css).toContain('.bb-input');
    expect(css).toMatch(/\.bb-input[\s\S]*:focus-visible/);
  });

  for (const file of MAIN_FEATURE_FILES) {
    test(`${file} avoids transition-all and focus:ring anti-patterns`, () => {
      const source = readFile(file);

      expect(source).not.toContain('transition-all');
      expect(source).not.toMatch(/focus:ring-/);
      expect(source).not.toMatch(/focus:outline-none/);
    });
  }

  test('dropdown-menu uses focus-visible for keyboard highlight', () => {
    const source = readFile('components/ui/dropdown-menu.tsx');

    expect(source).toContain('focus-visible:bg-muted');
    expect(source).not.toMatch(/focus:bg-muted/);
  });
});
