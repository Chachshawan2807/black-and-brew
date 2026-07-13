import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('motion-presets consolidation', () => {
  test('motion-presets exports shared UI animation presets', () => {
    const code = readFile('lib/motion-presets.ts');

    expect(code).toContain('export const statusBanner');
    expect(code).toContain('export const sectionReveal');
    expect(code).toContain('export const staggeredSection');
    expect(code).toContain('export const listRowReveal');
    expect(code).toContain('export const slideInLeft');
    expect(code).toContain('export const expandPanel');
    expect(code).toContain('export const fabIconOpen');
    expect(code).toContain('export const fabIconClose');
    expect(code).toContain('export const alertSlideIn');
    expect(code).toContain('export function applyMotionPreset');
    expect(code).toContain('export function staggerDelay');
    expect(code).toContain('export const FAB_HOVER');
    expect(code).toContain('export const FAB_TAP');
    expect(code).toContain('export const pinStatusText');
    expect(code).toContain('export const pinInputPanel');
  });

  const hoverTapFiles: { file: string; hover: string; tap: string }[] = [
    {
      file: 'app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx',
      hover: 'FAB_HOVER',
      tap: 'FAB_TAP',
    },
    {
      file: 'components/ai/AIChatOverlay.tsx',
      hover: 'FAB_HOVER',
      tap: 'FAB_TAP',
    },
    {
      file: 'components/notifications/NotificationBell.tsx',
      hover: 'FAB_HOVER',
      tap: 'FAB_TAP',
    },
    {
      file: 'components/floating/FabStackHideToggle.tsx',
      hover: 'FAB_SUBTLE_HOVER',
      tap: 'FAB_TAP',
    },
    {
      file: 'app/[locale]/maintenance/MaintenanceClient.tsx',
      hover: 'BUTTON_HOVER',
      tap: 'BUTTON_TAP',
    },
  ];

  for (const { file, hover, tap } of hoverTapFiles) {
    test(`${file} uses shared hover/tap presets`, () => {
      const code = readFile(file);
      expect(code).toContain(hover);
      expect(code).toContain(tap);
      expect(code).not.toMatch(/whileHover=\{\{\s*scale:/);
    });
  }

  test('LiveShiftList uses card lift hover presets', () => {
    const code = readFile('app/[locale]/dashboard/_components/LiveShiftList.tsx');
    expect(code).toContain('CARD_LIFT_HOVER');
    expect(code).toContain('CARD_PRESS_TAP');
  });

  test('PinGateway uses shared pin motion presets', () => {
    const code = readFile('components/auth/PinGateway.tsx');
    expect(code).toContain('pinStatusText');
    expect(code).toContain('pinVerifyingSpinner');
    expect(code).toContain('pinInputPanel');
    expect(code).toContain('pinMessageFade');
    expect(code).not.toMatch(/initial=\{\{\s*opacity:\s*0,\s*y:\s*5\s*\}\}/);
  });

  test('ScheduleClient keeps DnD spring transitions outside presets', () => {
    const code = readFile('app/[locale]/schedule/ScheduleClient.tsx');
    expect(code).toMatch(/type:\s*"spring"/);
    expect(code).not.toContain('FAB_HOVER');
  });

  const consolidatedFiles = [
    'app/[locale]/sales/SalesClient.tsx',
    'app/[locale]/maintenance/MaintenanceClient.tsx',
    'app/[locale]/dashboard/_components/LiveShiftList.tsx',
    'app/[locale]/inventory/InventoryClient.tsx',
    'app/[locale]/inventory/count/InventoryCountClient.tsx',
    'components/ui/floating-alert.tsx',
    'app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx',
    'components/ai/AIChatOverlay.tsx',
    'components/auth/PinGateway.tsx',
  ];

  for (const file of consolidatedFiles) {
    test(`${file} imports shared motion presets`, () => {
      const code = readFile(file);
      expect(code).toContain("from '@/lib/motion-presets'");
      expect(code).not.toMatch(/initial=\{\{\s*opacity:\s*0,\s*y:\s*10\s*\}\}/);
    });
  }

  const fabIconSwapFiles = [
    'app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx',
    'components/ai/AIChatOverlay.tsx',
  ];

  for (const file of fabIconSwapFiles) {
    test(`${file} maps fab icon presets to the icon shown (not panel state)`, () => {
      const code = readFile(file);
      const closeBranch = code.match(/key="close"[\s\S]*?<\/motion\.span>/)?.[0] ?? '';
      const openBranch = code.match(/key="open"[\s\S]*?<\/motion\.span>/)?.[0] ?? '';

      expect(closeBranch).toContain('fabIconClose');
      expect(closeBranch).not.toContain('fabIconOpen');
      expect(openBranch).toContain('fabIconOpen');
      expect(openBranch).not.toContain('fabIconClose');
    });
  }
});
