import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Inventory Quick Action FAB', () => {
  test('quick action FAB panel stays vertically centered on mobile when bulk queue grows', () => {
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );
    const layoutCode = fs.readFileSync(
      path.resolve(__dirname, '../lib/floating-action-layout.ts'),
      'utf-8',
    );

    expect(layoutCode).toContain('FAB_PANEL_CENTERED_MOBILE_WRAPPER_CLASS');
    expect(layoutCode).toMatch(/FAB_PANEL_ABOVE_NOTIFICATION_CLASS = 'md:bottom/);
    expect(layoutCode).not.toMatch(
      /FAB_PANEL_ABOVE_NOTIFICATION_CLASS[\s\S]*max-md:bottom/,
    );
    expect(fabCode).toContain('FAB_PANEL_CENTERED_MOBILE_WRAPPER_CLASS');
    expect(layoutCode).toMatch(/max-md:flex max-md:items-center max-md:justify-center/);
    expect(fabCode).toContain('max-md:relative max-md:w-full');
    expect(fabCode).not.toMatch(/max-md:bottom-\[calc\(14\.5rem/);
  });

  test('layout mounts global quick action and notification FABs', () => {
    const layoutCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/layout.tsx'),
      'utf-8',
    );
    const deferredCode = fs.readFileSync(
      path.resolve(__dirname, '../components/shell/DeferredOverlays.tsx'),
      'utf-8',
    );

    expect(layoutCode).toContain('<DeferredOverlays />');
    expect(deferredCode).toContain('<InventoryQuickActionWrapper />');
    expect(deferredCode).toContain('<InventoryNotificationFAB />');
    expect(deferredCode).toContain('notificationFabReady');
    expect(deferredCode).toContain('quickActionReady');
    expect(deferredCode).not.toContain('AIChatOverlay');
    expect(layoutCode).toContain('<FabStackHideToggle />');
  });

  test('FAB stack uses safe-area-aware positions without AI chat layer', () => {
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );
    const layoutCode = fs.readFileSync(
      path.resolve(__dirname, '../lib/floating-action-layout.ts'),
      'utf-8',
    );

    expect(fabCode).toContain('z-[201]');
    expect(fabCode).toContain('FAB_BOTTOM_QUICK_ACTION_CLASS');
    expect(layoutCode).toContain('max-md:bottom-[calc(4rem+env(safe-area-inset-bottom,0px))]');
    expect(layoutCode).toContain('md:bottom-[4.25rem]');
    expect(layoutCode).toContain('max-md:bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))]');
    expect(layoutCode).toContain('md:bottom-[7.75rem]');
    expect(layoutCode).not.toContain('FAB_BOTTOM_AI_CLASS');
    expect(fabCode).toContain('InventoryQuickActionBar');
    expect(fabCode).toContain('overflow-y-auto');
    expect(fabCode).toContain('bb-smooth-scroll');
    expect(fabCode).toContain('inventoryQuickActionTypeColors(quickAction.quickType)');
    expect(fabCode).toContain('FabFadePresence');
    expect(fabCode).toContain('<Package');
    expect(fabCode).not.toContain('PackagePlus');
  });

  test('layout mounts inventory notification FAB above quick action', () => {
    const deferredCode = fs.readFileSync(
      path.resolve(__dirname, '../components/shell/DeferredOverlays.tsx'),
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

    expect(deferredCode).toContain('InventoryNotificationFAB');
    expect(deferredCode).toContain('notificationFabReady');
    expect(deferredCode).toContain('quickActionReady');
    expect(notifyCode).toContain('variant="fab"');
    expect(notifyCode).not.toContain('/inventory');
    expect(notifyCode).toMatch(/isAnyOtherOpen\('notification'\)/);
    expect(notifyCode).toMatch(/fabStackHidden \|\| fabStackSuppressed \|\| isAnyOtherOpen/);
    expect(notifyCode).toContain('FAB_BOTTOM_NOTIFICATION_CLASS');
    expect(notifyCode).not.toContain('FAB_BOTTOM_AI_CLASS');
    expect(bellCode).toContain('bg-red-500');
    expect(bellCode).toContain('INVENTORY_QUICK_ACTION_COLORS.fab');
    expect(bellCode).toContain('<Bell');
    expect(bellCode).not.toContain('PWA_BRAND_ICON');
    expect(bellCode).not.toContain('bg-transparent');
  });

  test('inventory page reuses shared quick action bar component', () => {
    const pageCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx'),
      'utf-8',
    );
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx'),
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
    expect(layoutCode).toMatch(/Hide toggle[\s\S]*Quick Action/);
    expect(contextCode).toContain('fabStackHidden');
    expect(contextCode).toContain('bb-fab-stack-hidden');
    expect(layoutCode).toContain('w-8 h-8');
  });

  test('sort_order reorder syncs via reorderInventoryItems server action', () => {
    const pageCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx'),
      'utf-8',
    );

    expect(pageCode).toContain("field === 'sort_order'");
    expect(pageCode).toContain('reorderInventoryItems');
  });

  test('quick action hook tags audit logs with notification source', () => {
    const hookCode = fs.readFileSync(
      path.resolve(__dirname, '../hooks/use-inventory-quick-action.ts'),
      'utf-8',
    );
    const pageCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx'),
      'utf-8',
    );
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );

    expect(hookCode).toContain('notificationSource');
    expect(pageCode).toContain('QUICK_ACTION_BAR');
    expect(fabCode).toContain('QUICK_ACTION_FAB');
  });

  test('inventory page collapses the inline quick action bar after a successful save', () => {
    const pageCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx'),
      'utf-8',
    );

    expect(pageCode).toContain('isQuickActionBarOpen');
    expect(pageCode).toMatch(/onAfterSave:[\s\S]*setIsQuickActionBarOpen\(false\)/);
    expect(pageCode).toContain('เปิด Quick Action');
  });

  test('inventory count page suppresses stock notifications', () => {
    const countCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/count/InventoryCountClient.tsx'),
      'utf-8',
    );

    expect(countCode).toContain('suppressNotification: true');
    expect(countCode).toContain("notificationContext: 'inventory_count'");
  });

  test('main FAB triggers respect fabStackHidden', () => {
    const notifyCode = fs.readFileSync(
      path.resolve(__dirname, '../components/notifications/InventoryNotificationFAB.tsx'),
      'utf-8',
    );
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );

    expect(notifyCode).toContain('fabStackHidden');
    expect(fabCode).toContain('fabStackHidden');
  });

  test('quick action qty inputs ignore mouse wheel to avoid accidental changes', () => {
    const barCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionBar.tsx'),
      'utf-8',
    );

    expect(barCode).toContain('blurQtyInputOnWheel');
    const numberInputCount = (barCode.match(/type="number"/g) ?? []).length;
    const wheelHandlerCount = (barCode.match(/onWheel=\{blurQtyInputOnWheel\}/g) ?? []).length;
    expect(wheelHandlerCount).toBe(numberInputCount);
    expect(numberInputCount).toBeGreaterThanOrEqual(2);
  });

  test('bulk submit confirm renders via portal above FAB overlays', () => {
    const barCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionBar.tsx'),
      'utf-8',
    );
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );

    expect(barCode).toContain('createPortal');
    expect(barCode).toContain('BulkSubmitConfirmDialog');
    expect(barCode).toContain('z-[220]');
    expect(barCode).not.toMatch(/BulkSubmitConfirmDialog[\s\S]*<dialog/);
    expect(fabCode).toContain('bg-card rounded-3xl');
    expect(fabCode).toContain('isolate');
  });

  test('bulk submit confirm keeps actions visible when the preview list is long', () => {
    const barCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionBar.tsx'),
      'utf-8',
    );
    const confirmDialog = barCode.match(
      /function BulkSubmitConfirmDialog\([\s\S]*?\n\}\n\nfunction SecondaryQuickActionButtons/,
    )?.[0];

    expect(confirmDialog).toBeTruthy();
    expect(confirmDialog).toMatch(
      /role="dialog"[\s\S]*max-h-\[min\(85dvh,calc\(100%-2rem\)\)\][\s\S]*overflow-hidden[\s\S]*min-h-0/,
    );
    expect(confirmDialog).toMatch(
      /min-h-0 flex-1 overflow-y-auto bb-smooth-scroll/,
    );
    expect(confirmDialog).toMatch(
      /shrink-0[\s\S]*ยืนยัน\$\{typeLabel\}/,
    );
  });

  test('bulk submit confirm shows resolved qty so empty defaults appear as 1', () => {
    const barCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionBar.tsx'),
      'utf-8',
    );
    expect(barCode).toContain('formatBulkConfirmQty');
    expect(barCode).toMatch(/formatBulkConfirmQty\(\s*line\.qty\s*,\s*bulkQuickType\s*\)/);
    expect(barCode).not.toMatch(/\{typeLabel\} \{line\.qty\} \{line\.unit\}/);
  });

  test('quick action bar uses aligned 3-column mobile action grid', () => {
    const barCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionBar.tsx'),
      'utf-8',
    );

    expect(barCode).toContain('grid grid-cols-3 gap-2 w-full box-border sm:hidden');
    expect(barCode).toContain('ACTION_CELL_CLASS');
    expect(barCode).toContain('QuickActionTypeToggle');
    expect(barCode).toContain('stepQuickQtyValue');
    expect(barCode).toContain('aria-label="เพิ่มจำนวน"');
    expect(barCode).toContain('sm:flex-1 sm:min-w-0');
    expect(barCode).toContain('sm:flex-1 sm:min-w-[9rem]');
    expect(barCode).toContain("bulkMode ? 'min-w-[8.75rem] w-max' : 'w-[6rem]'");
    expect(barCode).toContain('whitespace-nowrap tabular-nums shrink-0');
    expect(barCode).not.toContain('bb-quick-search-fit');
  });

  test('mobile qty type and save controls stay visible while search suggestions are open', () => {
    const barCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionBar.tsx'),
      'utf-8',
    );

    const mobileGridMatch = barCode.match(
      /grid grid-cols-3 gap-2 w-full box-border sm:hidden[\s\S]*?SecondaryQuickActionButtons/,
    );
    expect(mobileGridMatch).toBeTruthy();
    expect(mobileGridMatch![0]).not.toContain('collapseBulkQueueForSearch');
    expect(barCode).toMatch(
      /bulkMode && bulkPreviews\.length > 0 && !collapseBulkQueueForSearch/,
    );
  });

  test('quick action save uses explicit button click for reliable mobile touch submit', () => {
    const barCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionBar.tsx'),
      'utf-8',
    );

    expect(barCode).toMatch(/function QuickActionSaveButton[\s\S]*type="button"/);
    expect(barCode).toMatch(/function QuickActionSaveButton[\s\S]*blurActiveElement\(\)/);
    expect(barCode).toMatch(/function QuickActionSaveButton[\s\S]*inventoryQuickActionTypeColors\(quickType\)/);
  });

  test('quick search suggestions select items via pointerdown for iOS touch', () => {
    const barCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionBar.tsx'),
      'utf-8',
    );

    expect(barCode).toMatch(/onPointerDown=\{\(e\) => \{[\s\S]*selectQuickSearchItem\(item\)/);
    expect(barCode).not.toMatch(/onMouseDown=\{\(e\) => \{[\s\S]*selectQuickSearchItem\(item\)/);
  });

  test('bulk queue summary does not expose paste-multiple-names control', () => {
    const barCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionBar.tsx'),
      'utf-8',
    );
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );
    const clientCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx'),
      'utf-8',
    );
    const hookCode = fs.readFileSync(
      path.resolve(__dirname, '../hooks/use-inventory-quick-action.ts'),
      'utf-8',
    );

    expect(barCode).not.toContain('วางชื่อหลายรายการ');
    expect(barCode).not.toContain('ClipboardPaste');
    expect(barCode).not.toContain('onBulkPaste');
    expect(fabCode).not.toContain('onBulkPaste');
    expect(clientCode).not.toContain('onBulkPaste');
    expect(hookCode).not.toContain('handleBulkPaste');
    expect(hookCode).not.toContain('buildBulkQueueFromPaste');
  });

  test('quick search suggestions support arrow-key navigation on desktop', () => {
    const barCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionBar.tsx'),
      'utf-8',
    );

    expect(barCode).toContain('stepQuickSearchHighlight');
    expect(barCode).toContain('resolveQuickSearchHighlightForEnter');
    expect(barCode).toContain("e.key === 'ArrowDown'");
    expect(barCode).toContain("e.key === 'ArrowUp'");
    expect(barCode).toContain('aria-activedescendant');
    expect(barCode).toContain('role="listbox"');
    expect(barCode).toContain('aria-label="ล้างการค้นหา"');
    expect(barCode).toContain('handleClearQuickSearch');
  });

  test('quick action FAB uses a single keyed overlay for exit animation', () => {
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );

    expect(fabCode).toContain('key="quick-action-overlay"');
    expect(fabCode).toContain('onExitComplete');
    expect(fabCode).toContain('isPanelRendered');
    expect(fabCode).not.toMatch(/panelOpen && \(\s*<>/);
    expect(fabCode).not.toContain('key="quick-action-backdrop"');
    expect(fabCode).not.toContain('key="quick-action-panel"');
  });

  test('quick action FAB keeps overlay registered until panel exit completes', () => {
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );

    expect(fabCode).toMatch(/quickOverlayActive[\s\S]*isPanelRendered/);
    expect(fabCode).toMatch(/useVisualViewportInsets\(isMounted && isPanelRendered\)/);
    expect(fabCode).toMatch(/aria-expanded=\{isPanelRendered\}/);
  });

  test('quick action inputs use 16px on mobile to prevent iOS focus zoom', () => {
    const barCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionBar.tsx'),
      'utf-8',
    );

    // iOS Safari auto-zooms inputs with font-size < 16px, breaking visualViewport overlays.
    const inputClassMatches = [...barCode.matchAll(/<input[\s\S]*?className=\{cn\([\s\S]*?\)\}/g)];
    expect(inputClassMatches.length).toBeGreaterThanOrEqual(3);
    for (const match of inputClassMatches) {
      expect(match[0]).toContain('text-base md:text-sm');
    }
  });

  test('FAB bulk mode on mobile uses fixed shell with internal queue scroll', () => {
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );
    const barCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionBar.tsx'),
      'utf-8',
    );
    const layoutCode = fs.readFileSync(
      path.resolve(__dirname, '../lib/floating-action-layout.ts'),
      'utf-8',
    );

    expect(layoutCode).toContain('FAB_MOBILE_BULK_PANEL_SHELL_CLASS');
    expect(fabCode).toContain('fabMobileBulkQueueActive');
    expect(fabCode).toContain('FAB_MOBILE_BULK_PANEL_SHELL_CLASS');
    expect(fabCode).toContain('fabMobileBulkShell={fabMobileBulkQueueActive}');
    expect(barCode).toContain('fabMobileBulkShell?: boolean');
    expect(barCode).toContain('fillAvailableHeight={fabMobileBulkShell}');
    expect(barCode).toMatch(/fillAvailableHeight \? 'flex-1 min-h-0' : 'max-h-\[min\(42dvh,15rem\)\]'/);
  });

  test('quick action FAB keeps mobile panel centered when keyboard is open', () => {
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );
    const barCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionBar.tsx'),
      'utf-8',
    );

    expect(fabCode).not.toContain('mobileKeyboardSheet');
    expect(fabCode).not.toContain('getMobileQuickActionKeyboardSheetBackdropStyle');
    expect(fabCode).not.toContain('getMobileQuickActionKeyboardSheetPanelStyle');
    expect(fabCode).toContain('getModalBackdropKeyboardAwareStyle');
    expect(fabCode).toContain('getModalContentKeyboardAwareStyle');
    expect(fabCode).toMatch(/FAB_PANEL_CENTERED_MOBILE_WRAPPER_CLASS/);
    expect(fabCode).not.toMatch(/!mobileKeyboardSheet && 'isolate'/);
    expect(fabCode).toContain("verticalAlign: 'center'");
    expect(fabCode).not.toContain('keyboardOpenOnMobile');
    expect(fabCode).not.toContain('!keyboardOpenOnMobile && FAB_PANEL_CENTERED_MOBILE_WRAPPER_CLASS');
    expect(fabCode).toContain('document.body.style.overflow = \'hidden\'');
    expect(barCode).toContain('shouldPortalQuickSearchSuggestions');
    expect(barCode).toContain('shouldCollapseBulkQueueForMobileSearch');
    expect(barCode).toContain('shouldHideQuickActionChromeForMobileSearch');
    expect(barCode).toContain('getAnchoredSuggestionsOverlayStyle');
    expect(barCode).toContain('createPortal');
    expect(barCode).toContain('useLayoutEffect');
    expect(barCode).toContain('viewportInsets.offsetLeft');
    expect(barCode).toContain('viewportInsets.visibleWidth');
    expect(barCode).toContain("!portalSuggestions && 'slide-in-from-top-2'");
  });

  test('quick action FAB blurs focused input before closing after save', () => {
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );

    expect(fabCode).toContain('blurActiveElement');
    expect(fabCode).toMatch(/onAfterSave:[\s\S]*blurActiveElement/);
  });

  test('inventory page hides inline quick action while global FAB overlay is open', () => {
    const pageCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx'),
      'utf-8',
    );

    expect(pageCode).toContain('useFloatingOverlay');
    expect(pageCode).toMatch(/isFloatingOverlayOpen\('quick-action'\)/);
    expect(pageCode).toMatch(/isQuickActionBarOpen && !quickActionFabOpen/);
  });

  test('quick action FAB defers history prefetch until idle', () => {
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );

    expect(fabCode).toContain('requestIdleCallback');
    expect(fabCode).toMatch(/scheduleHistoryPrefetch[\s\S]*prefetchInventoryHistoryFirstPage/);
    expect(fabCode).not.toMatch(
      /setIsPanelRendered\(true\);\s*\n\s*void prefetchInventoryHistoryFirstPage\(\)/,
    );
  });

  test('quick action FAB does not refetch frequent items on every open', () => {
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );

    const openEffect = fabCode.match(
      /useEffect\(\(\) => \{\s*if \(!isMounted \|\| !isOpen\) return;[\s\S]*?\}, \[isMounted, isOpen, refresh, hasLoadedItems\]\);/,
    )?.[0];

    expect(openEffect).toBeTruthy();
    expect(openEffect).not.toContain('loadFrequentItems');
  });

  test('quick save applies optimistic stock before server action returns', () => {
    const hookCode = fs.readFileSync(
      path.resolve(__dirname, '../hooks/use-inventory-quick-action.ts'),
      'utf-8',
    );

    expect(hookCode).toContain('computeOptimisticStockAfterTransaction');
    expect(hookCode).toMatch(/onAfterSave\?\.\([\s\S]*setIsQuickPending\(false\)/);
    expect(hookCode).toMatch(/void \(async \(\) => \{[\s\S]*await recordTransaction/);
  });

  test('inventory modals portal above FAB overlays with shared z-index', () => {
    const layoutCode = fs.readFileSync(
      path.resolve(__dirname, '../lib/floating-action-layout.ts'),
      'utf-8',
    );
    const portalCode = fs.readFileSync(
      path.resolve(__dirname, '../components/ui/modal-portal.tsx'),
      'utf-8',
    );
    const purchaseCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/PurchaseOrdersModal.tsx'),
      'utf-8',
    );
    const historyCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryHistoryModal.tsx'),
      'utf-8',
    );
    const addCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryAddItemModal.tsx'),
      'utf-8',
    );
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );

    expect(layoutCode).toContain('INVENTORY_MODAL_Z_CLASS');
    expect(layoutCode).toContain('z-[220]');
    expect(portalCode).toContain('createPortal');
    expect(purchaseCode).toContain('InventoryModalPortal');
    expect(purchaseCode).toContain('INVENTORY_MODAL_Z_CLASS');
    expect(purchaseCode).not.toContain('z-[150]');
    expect(historyCode).toContain('InventoryModalPortal');
    expect(historyCode).toContain('INVENTORY_MODAL_Z_CLASS');
    expect(addCode).toContain('InventoryModalPortal');
    expect(addCode).toContain('INVENTORY_MODAL_Z_CLASS');
    expect(fabCode).toContain('openPurchaseOrderModal');
    expect(fabCode).toContain('openAddItemModal');
    expect(fabCode).toContain('openHistoryModal');
    expect(fabCode).toContain('prefetchInventoryHistoryFirstPage');
    expect(fabCode).toMatch(
      /toggleQuickPanel[\s\S]*prefetchInventoryHistoryFirstPage/,
    );
  });

  test('quick action wrapper mounts globally from deferred overlays on all routes', () => {
    const wrapperCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionWrapper.tsx'),
      'utf-8',
    );
    const deferredCode = fs.readFileSync(
      path.resolve(__dirname, '../components/shell/DeferredOverlays.tsx'),
      'utf-8',
    );

    expect(wrapperCode).toContain('InventoryQuickActionFAB');
    expect(wrapperCode).not.toContain('return null');
    expect(deferredCode).not.toContain('isInventoryRoute');
    expect(deferredCode).toContain('InventoryQuickActionWrapper');
  });
});
