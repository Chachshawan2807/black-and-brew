import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Inventory Quick Action FAB', () => {
  test('layout mounts global quick action wrapper above AI chat', () => {
    const layoutCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/layout.tsx'),
      'utf-8',
    );

    expect(layoutCode).toMatch(
      /<InventoryQuickActionWrapper\s*\/>\s*\r?\n\s*<InventoryNotificationFAB\s*\/>\s*\r?\n\s*<AIChatOverlay/,
    );
    expect(layoutCode).toContain('<FabStackHideToggle />');
  });

  test('AI chat window stacks above the inventory FAB when open', () => {
    const chatCode = fs.readFileSync(
      path.resolve(__dirname, '../components/ai/AIChatOverlay.tsx'),
      'utf-8',
    );
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../components/inventory/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );

    expect(chatCode).toContain('z-[203]');
    expect(fabCode).toContain('z-[201]');
  });

  test('FAB is positioned above the AI chat trigger with safe-area support', () => {
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../components/inventory/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );
    const layoutCode = fs.readFileSync(
      path.resolve(__dirname, '../lib/floating-action-layout.ts'),
      'utf-8',
    );

    expect(fabCode).toContain('z-[201]');
    expect(fabCode).toContain('FAB_BOTTOM_QUICK_ACTION_CLASS');
    expect(layoutCode).toContain('max-md:bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))]');
    expect(layoutCode).toContain('md:bottom-[7.75rem]');
    expect(layoutCode).toContain('max-md:bottom-[calc(11rem+env(safe-area-inset-bottom,0px))]');
    expect(fabCode).toContain('InventoryQuickActionBar');
    expect(fabCode).toContain('overflow-visible');
    expect(fabCode).not.toContain('overflow-y-auto max-h-full');
    expect(fabCode).toContain('FAB_BASE_CLASS');
    expect(fabCode).toContain('<Package');
    expect(fabCode).not.toContain('PackagePlus');
  });

  test('layout mounts inventory notification FAB above quick action', () => {
    const layoutCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/layout.tsx'),
      'utf-8',
    );
    const notifyCode = fs.readFileSync(
      path.resolve(__dirname, '../components/notifications/InventoryNotificationFAB.tsx'),
      'utf-8',
    );
    const bellCode = fs.readFileSync(
      path.resolve(__dirname, '../components/notifications/NotificationBell.tsx'),
      'utf-8',
    );

    expect(layoutCode).toContain('InventoryNotificationFAB');
    expect(layoutCode).toMatch(/<InventoryQuickActionWrapper\s*\/>\s*\r?\n\s*<InventoryNotificationFAB/);
    expect(notifyCode).toContain('variant="fab"');
    expect(notifyCode).not.toContain('/inventory');
    expect(notifyCode).not.toContain('isAnyOtherOpen');
    expect(notifyCode).toContain('const hidden = panelOpen');
    expect(notifyCode).toContain('FAB_BOTTOM_NOTIFICATION_CLASS');
    expect(notifyCode).toContain('FAB_BOTTOM_AI_CLASS');
    expect(bellCode).toContain('bg-red-500');
    expect(bellCode).toContain('bg-[#000000]');
  });

  test('inventory page reuses shared quick action bar component', () => {
    const pageCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx'),
      'utf-8',
    );
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../components/inventory/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );

    expect(pageCode).toContain('InventoryQuickActionBar');
    expect(pageCode).not.toContain('placeholder="ค้นหาสินค้า..."');
    expect(fabCode).not.toContain('debouncedQuickSearch');
    expect(pageCode).not.toContain('debouncedQuickSearch');
  });

  test('FAB stack hide toggle is smaller, translucent, and wired to shared context', () => {
    const hideCode = fs.readFileSync(
      path.resolve(__dirname, '../components/floating/FabStackHideToggle.tsx'),
      'utf-8',
    );
    const contextCode = fs.readFileSync(
      path.resolve(__dirname, '../components/floating/FloatingOverlayContext.tsx'),
      'utf-8',
    );
    const layoutCode = fs.readFileSync(
      path.resolve(__dirname, '../lib/floating-action-layout.ts'),
      'utf-8',
    );

    expect(hideCode).toContain('FAB_HIDE_TOGGLE_SIZE_CLASS');
    expect(hideCode).toContain('Minus');
    expect(hideCode).toContain('text-white');
    expect(hideCode).toContain('bg-white/10');
    expect(layoutCode).toContain('FAB_BOTTOM_HIDE_TOGGLE_CLASS');
    expect(layoutCode).toMatch(/Hide toggle.*AI Chat/s);
    expect(contextCode).toContain('fabStackHidden');
    expect(contextCode).toContain('bb-fab-stack-hidden');
    expect(layoutCode).toContain('w-8 h-8');
  });

  test('sort_order reorder logs audit for notifications', () => {
    const pageCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx'),
      'utf-8',
    );

    expect(pageCode).toContain("operation: 'reorder_sort_order'");
    expect(pageCode).toMatch(/field === 'sort_order'[\s\S]*logClientDataChange/);
  });

  test('inventory count page does not suppress notifications', () => {
    const countCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/count/InventoryCountClient.tsx'),
      'utf-8',
    );

    expect(countCode).not.toContain('suppressNotification: true');
  });

  test('main FAB triggers respect fabStackHidden', () => {
    const notifyCode = fs.readFileSync(
      path.resolve(__dirname, '../components/notifications/InventoryNotificationFAB.tsx'),
      'utf-8',
    );
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../components/inventory/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );
    const chatCode = fs.readFileSync(
      path.resolve(__dirname, '../components/ai/AIChatOverlay.tsx'),
      'utf-8',
    );

    expect(notifyCode).toContain('fabStackHidden');
    expect(fabCode).toContain('fabStackHidden');
  });

  test('quick action bar uses aligned 3-column mobile action grid', () => {
    const barCode = fs.readFileSync(
      path.resolve(__dirname, '../components/inventory/InventoryQuickActionBar.tsx'),
      'utf-8',
    );

    expect(barCode).toContain('grid grid-cols-3 gap-2 w-full box-border sm:hidden');
    expect(barCode).toContain('ACTION_CELL_CLASS');
    expect(barCode).toContain('QuickActionTypeToggle');
    expect(barCode).toContain('stepQuickQtyValue');
    expect(barCode).toContain('aria-label="เพิ่มจำนวน"');
    expect(barCode).toContain('sm:flex-1 sm:min-w-0');
    expect(barCode).toContain('sm:flex-1 sm:min-w-[9rem]');
    expect(barCode).toContain('w-[6rem] shrink-0');
    expect(barCode).not.toContain('bb-quick-search-fit');
  });

  test('quick action wrapper renders FAB on every page (global layout)', () => {
    const wrapperCode = fs.readFileSync(
      path.resolve(__dirname, '../components/inventory/InventoryQuickActionWrapper.tsx'),
      'utf-8',
    );

    expect(wrapperCode).toContain('InventoryQuickActionFAB');
    expect(wrapperCode).not.toContain('usePathname');
    expect(wrapperCode).not.toContain('return null');
  });
});
