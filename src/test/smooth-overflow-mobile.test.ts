import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('bb-smooth-scroll — mobile overflow utility', () => {
  test('globals.css defines touch momentum scrolling utility', () => {
    const css = readFile('app/[locale]/globals.css');
    expect(css).toMatch(/\.bb-smooth-scroll\s*\{/);
    expect(css).toMatch(/-webkit-overflow-scrolling:\s*touch/);
    expect(css).toMatch(/touch-action:\s*pan-x\s+pan-y/);
  });

  const scrollSurfaces: { file: string; pattern: RegExp }[] = [
    {
      file: 'components/inventory/InventoryHistoryModal.tsx',
      pattern: /flex-1 min-h-0 overflow-y-auto overflow-x-auto[\s\S]*bb-smooth-scroll/,
    },
    {
      file: 'components/notifications/NotificationPanel.tsx',
      pattern: /flex-1 min-h-0 overflow-y-auto[\s\S]*bb-smooth-scroll/,
    },
    {
      file: 'app/[locale]/schedule/ScheduleClient.tsx',
      pattern: /flex-1 min-h-0 overflow-x-auto[\s\S]*overflow-y-auto[\s\S]*bb-smooth-scroll/,
    },
    {
      file: 'app/[locale]/maintenance/MaintenanceClient.tsx',
      pattern: /overflow-x-auto[\s\S]*bb-smooth-scroll/,
    },
    {
      file: 'app/[locale]/sales/SalesClient.tsx',
      pattern: /overflow-x-auto[\s\S]*bb-smooth-scroll/,
    },
    {
      file: 'components/inventory/InventoryQuickActionBar.tsx',
      pattern: /overflow-y-auto[\s\S]*bb-smooth-scroll/,
    },
    {
      file: 'app/[locale]/inventory/PurchaseOrdersModal.tsx',
      pattern: /overflow-y-auto[\s\S]*bb-smooth-scroll/,
    },
    {
      file: 'components/ai/AIChatOverlay.tsx',
      pattern: /flex-1 min-h-0 overflow-y-auto[\s\S]*bb-smooth-scroll/,
    },
  ];

  for (const { file, pattern } of scrollSurfaces) {
    test(`${file} applies bb-smooth-scroll on scroll containers`, () => {
      const code = readFile(file);
      expect(code).toMatch(pattern);
    });
  }
});
