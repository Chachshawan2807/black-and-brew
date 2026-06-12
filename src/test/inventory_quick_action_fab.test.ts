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
    expect(bellCode).toContain('FAB_BOTTOM_NOTIFICATION_CLASS');
    expect(bellCode).toContain('bg-[#000000]');
  });

  test('inventory page reuses shared quick action bar component', () => {
    const pageCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx'),
      'utf-8',
    );

    expect(pageCode).toContain('InventoryQuickActionBar');
    expect(pageCode).not.toContain('placeholder="ค้นหาสินค้า..."');
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
    expect(chatCode).toContain('fabStackHidden');
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
