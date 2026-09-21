import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

/**
 * Route shells and shared overlays that own mobile back history.
 * Popovers (date pickers, select listboxes, toasts) are intentionally excluded.
 */
describe('mobile back layer audit', () => {
  test('route shells register overlay stacks', () => {
    const shells: Array<{ file: string; marker: string }> = [
      { file: 'app/[locale]/schedule/ScheduleClient.tsx', marker: 'schedule-overlay' },
      { file: 'app/[locale]/inventory/InventoryClient.tsx', marker: 'inventory-overlay' },
      { file: 'app/[locale]/home/HomeClient.tsx', marker: 'home-overlay' },
      { file: 'app/[locale]/dashboard/_components/MonthlyRoster.tsx', marker: 'dashboard-roster-overlay' },
      { file: 'app/[locale]/dashboard/_components/LiveShiftList.tsx', marker: 'dashboard-weekly-overlay' },
      { file: 'app/[locale]/maintenance/MaintenanceClient.tsx', marker: 'maintenance-overlay' },
      { file: 'app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx', marker: 'branch-withdraw-overlay' },
      { file: 'app/[locale]/inventory/count/InventoryCountClient.tsx', marker: 'inventory-count-overlay' },
      { file: 'app/[locale]/bean-orders/BeanOrderFormClient.tsx', marker: 'bean-orders-overlay' },
    ];

    for (const { file, marker } of shells) {
      const source = readFile(file);
      expect(source, file).toContain('useMobileBackOverlayStack');
      expect(source, file).toContain(marker);
    }
  });

  test('global FAB and shell overlays use useMobileBackLayer', () => {
    const layers: Array<{ file: string; marker: string }> = [
      { file: 'components/sidebar/MobileNavDrawer.tsx', marker: 'mobile-nav-drawer' },
      { file: 'components/notifications/NotificationPanel.tsx', marker: 'notification-panel' },
      { file: 'app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx', marker: 'quick-action-overlay' },
      { file: 'components/PwaInstallButton.tsx', marker: 'pwa-install-overlay' },
    ];

    for (const { file, marker } of layers) {
      const source = readFile(file);
      expect(source, file).toContain('useMobileBackLayer');
      expect(source, file).toContain(marker);
    }
  });

  test('nested bean-order slip modal registers its own layer', () => {
    const slip = readFile('app/[locale]/bean-orders/_components/PaymentSlipViewer.tsx');
    expect(slip).toContain('useMobileBackLayer');
    expect(slip).toContain('bean-orders-slip-overlay');
  });

  test('inventory quick-action FAB includes bulk confirm in back stack', () => {
    const fab = readFile('app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx');
    expect(fab).toMatch(/quickOverlayActive[\s\S]*bulkConfirmOpen/);
    expect(fab).toMatch(/dismissQuickOverlay[\s\S]*cancelBulkSubmit/);
  });

  test('dashboard leave and export dialogs are owned by roster or weekly stacks', () => {
    const roster = readFile('app/[locale]/dashboard/_components/MonthlyRoster.tsx');
    expect(roster).toContain('exportDialogOpen');
    expect(roster).toContain('statDialog');

    const weekly = readFile('app/[locale]/dashboard/_components/LiveShiftList.tsx');
    expect(weekly).toContain('statDialog');
  });

  test('history hub preserves router state and never auto-backs on orphan unmount', () => {
    const lib = readFile('lib/mobile-back-layer.ts');
    const hook = readFile('hooks/use-mobile-back-layer.ts');
    expect(lib).toContain('preserveClaimedMobileBackOnReplace');
    expect(lib).toContain('shouldPopHistoryOnOrphanUnmount');
    expect(hook).toContain('window.history.state');
    expect(hook).toContain('ensureMobileBackHistoryGuard');
  });
});
