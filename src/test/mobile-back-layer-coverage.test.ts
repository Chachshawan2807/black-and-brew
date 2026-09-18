import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { MOBILE_BACK_LAYER_IDS } from '@/lib/mobile-back-layer';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

describe('mobile back overlay coverage', () => {
  test('registers route overlay layer ids for major ERP surfaces', () => {
    expect(MOBILE_BACK_LAYER_IDS).toContain('schedule-overlay');
    expect(MOBILE_BACK_LAYER_IDS).toContain('inventory-overlay');
    expect(MOBILE_BACK_LAYER_IDS).toContain('home-overlay');
    expect(MOBILE_BACK_LAYER_IDS).toContain('dashboard-roster-overlay');
    expect(MOBILE_BACK_LAYER_IDS).toContain('dashboard-weekly-overlay');
    expect(MOBILE_BACK_LAYER_IDS).toContain('maintenance-overlay');
    expect(MOBILE_BACK_LAYER_IDS).toContain('branch-withdraw-overlay');
    expect(MOBILE_BACK_LAYER_IDS).toContain('inventory-count-overlay');
    expect(MOBILE_BACK_LAYER_IDS).toContain('bean-orders-overlay');
    expect(MOBILE_BACK_LAYER_IDS).toContain('bean-orders-slip-overlay');
    expect(MOBILE_BACK_LAYER_IDS).toContain('pwa-install-overlay');
  });

  test('feature clients wire useMobileBackOverlayStack', () => {
    const clients = [
      'app/[locale]/schedule/ScheduleClient.tsx',
      'app/[locale]/inventory/InventoryClient.tsx',
      'app/[locale]/home/HomeClient.tsx',
      'app/[locale]/dashboard/_components/MonthlyRoster.tsx',
      'app/[locale]/dashboard/_components/LiveShiftList.tsx',
      'app/[locale]/maintenance/MaintenanceClient.tsx',
      'app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx',
      'app/[locale]/inventory/count/InventoryCountClient.tsx',
      'app/[locale]/bean-orders/BeanOrderFormClient.tsx',
    ];

    for (const relativePath of clients) {
      const source = readFile(relativePath);
      expect(source, relativePath).toContain('useMobileBackOverlayStack');
    }
  });
});
