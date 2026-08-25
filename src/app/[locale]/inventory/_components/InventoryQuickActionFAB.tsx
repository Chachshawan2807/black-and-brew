'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { Package, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeOverlay, modalContent, fabIconOpen, fabIconClose, FAB_HOVER, FAB_TAP } from '@/lib/motion-presets';
import {
  computePurchaseOrderDerivedState,
  getStockColorClass,
  type InventoryStockFields,
} from '@/lib/inventory-stock';
import {
  useInventoryRealtime,
  type InventoryRealtimeItem,
} from '@/contexts/InventoryRealtimeContext';
import {
  fetchFrequentItems,
} from '@/app/actions/inventory-actions';
import {
  loadFrequentItemsCache,
  saveFrequentItemsCache,
  shouldRefreshFrequentItems,
  touchFrequentItemInCache,
} from '@/lib/inventory-frequent-items';
import { useInventoryQuickAction } from '@/hooks/use-inventory-quick-action';
import { useInventoryHistory } from '@/hooks/use-inventory-history';
import { prefetchInventoryHistoryFirstPage } from '@/lib/inventory-history-prefetch';
import { INVENTORY_NOTIFICATION_SOURCES } from '@/lib/inventory-notification-filter';
import {
  FAB_SIZE_CLASS,
  FAB_BOTTOM_QUICK_ACTION_CLASS,
  FAB_PANEL_ABOVE_NOTIFICATION_CLASS,
  FAB_PANEL_CENTERED_MOBILE_WRAPPER_CLASS,
  FAB_MOBILE_BULK_PANEL_SHELL_CLASS,
  FAB_MOBILE_PANEL_MAX_HEIGHT_CLASS,
} from '@/lib/floating-action-layout';
import {
  INVENTORY_QUICK_ACTION_HOVER,
  inventoryQuickActionTypeColors,
} from '@/lib/shift-colors';
import { blurActiveElement } from '@/lib/blur-active-element';
import {
  getFabPanelKeyboardAwareStyle,
  getModalBackdropKeyboardAwareStyle,
  getModalContentKeyboardAwareStyle,
} from '@/lib/keyboard-aware-panel-style';
import { useVisualViewportInsets } from '@/hooks/use-visual-viewport-insets';
import { useMaxMd } from '@/hooks/use-max-md';
import { FabFadePresence } from '@/components/floating/FabFadePresence';
import { useFloatingOverlay } from '@/components/floating/FloatingOverlayContext';
import { useMobileBackLayer } from '@/hooks/use-mobile-back-layer';
import { useReadOnly } from '@/components/providers/AuthProvider';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { ExportProgressOverlay } from '@/components/ui/ExportProgressOverlay';
import { InventoryQuickActionBar } from './InventoryQuickActionBar';
import { InventoryHistoryModal } from './InventoryHistoryModal';
import { InventoryAddItemModal } from './InventoryAddItemModal';

const PurchaseOrdersModal = dynamic(() => import('./PurchaseOrdersModal'), { ssr: false });

type InventoryItem = InventoryRealtimeItem & InventoryStockFields;

export default function InventoryQuickActionFAB() {
  const isReadOnly = useReadOnly();
  const { fabStackHidden, fabStackSuppressed, isAnyOtherOpen, setOverlayOpen } = useFloatingOverlay();
  const {
    items,
    setItems,
    refresh,
    isLoading: isLoadingItems,
    hasLoaded: hasLoadedItems,
  } = useInventoryRealtime();

  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isPanelRendered, setIsPanelRendered] = useState(false);
  const [frequentItems, setFrequentItems] = useState(() => loadFrequentItemsCache());

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const history = useInventoryHistory();
  const {
    showHistoryModal,
    setShowHistoryModal,
    handleOpenHistory,
    refreshHistory,
    transactionHistory,
    historyTypeFilter,
    handleHistoryTypeFilterChange,
    handleLoadMoreHistory,
    hasMoreHistory,
    isHistoryLoading,
    isHistoryRefreshing,
    historySearchQuery,
    handleHistorySearchQueryChange,
  } = history;
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['all']);
  const [isExportingPO, setIsExportingPO] = useState(false);

  const maxMd = useMaxMd();
  const isMobile = maxMd === true;
  const isDesktop = maxMd === false;
  const viewportInsets = useVisualViewportInsets(isMounted && isPanelRendered);
  const mobileBackdropStyle = isMobile
    ? getModalBackdropKeyboardAwareStyle({
        insets: viewportInsets,
        verticalAlign: 'center',
      })
    : undefined;
  const mobilePanelStyle = isMobile
    ? getModalContentKeyboardAwareStyle({ insets: viewportInsets })
    : undefined;
  const desktopPanelStyle = isDesktop
    ? getFabPanelKeyboardAwareStyle({ insets: viewportInsets })
    : undefined;

  const loadFrequentItems = useCallback(async () => {
    const res = await fetchFrequentItems();
    if (res.success && res.data) {
      setFrequentItems(res.data);
      saveFrequentItemsCache(res.data);
    }
  }, []);

  const quickAction = useInventoryQuickAction({
    items,
    setItems,
    isReadOnly,
    showHistoryModal,
    onHistoryRefresh: refreshHistory,
    isItemsLoaded: hasLoadedItems,
    notificationSource: INVENTORY_NOTIFICATION_SOURCES.QUICK_ACTION_FAB,
    onAfterSave: (saved) => {
      blurActiveElement();
      if (saved?.id && saved.name) {
        setFrequentItems(touchFrequentItemInCache({ id: saved.id, name: saved.name }));
      }
      setIsOpen(false);
    },
  });

  const fabMobileBulkQueueActive =
    isMobile && quickAction.bulkMode && quickAction.bulkQueue.length > 0;
  const fabMobileBulkFixedHeight =
    fabMobileBulkQueueActive && !viewportInsets.isKeyboardOpen;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-only mount gate
    setIsMounted(true);
  }, []);

  useEffect(() => {

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- keep panel mounted through exit animation
      setIsPanelRendered(true);
    }
  }, [isOpen]);

  const handlePanelExitComplete = useCallback(() => {
    if (!isOpen) {
      setIsPanelRendered(false);
    }
  }, [isOpen]);

  const closeQuickPanel = useCallback(() => {
    blurActiveElement();
    setIsOpen(false);
  }, []);

  const openPurchaseOrderModal = useCallback(() => {
    setShowPurchaseOrderModal(true);
    setIsOpen(false);
  }, []);

  const openAddItemModal = useCallback(() => {
    setShowAddModal(true);
    setIsOpen(false);
  }, []);

  const openHistoryModal = useCallback(() => {
    handleOpenHistory();
    setIsOpen(false);
  }, [handleOpenHistory]);

  const toggleQuickPanel = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) {
        blurActiveElement();
        return false;
      }
      setIsPanelRendered(true);
      const scheduleHistoryPrefetch = () => {
        void prefetchInventoryHistoryFirstPage();
      };
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(scheduleHistoryPrefetch, { timeout: 2_000 });
      } else {
        setTimeout(scheduleHistoryPrefetch, 0);
      }
      return true;
    });
  }, []);

  const dismissQuickOverlay = useCallback(() => {
    blurActiveElement();
    setIsOpen(false);
    setShowAddModal(false);
    setShowHistoryModal(false);
    setShowPurchaseOrderModal(false);
  }, [setShowHistoryModal]);

  const quickOverlayActive =
    isPanelRendered || showAddModal || showHistoryModal || showPurchaseOrderModal;

  useMobileBackLayer('quick-action-overlay', quickOverlayActive, dismissQuickOverlay);
  const hideQuickActionButton =
    fabStackHidden ||
    fabStackSuppressed ||
    isAnyOtherOpen('quick-action') ||
    showAddModal ||
    showHistoryModal ||
    showPurchaseOrderModal;

  useEffect(() => {
    setOverlayOpen('quick-action', quickOverlayActive);
  }, [quickOverlayActive, setOverlayOpen]);

  useEffect(() => {
    if (!fabStackHidden && !fabStackSuppressed) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close overlays when fab stack is hidden
    setIsOpen(false);
    setShowAddModal(false);
    setShowHistoryModal(false);
    setShowPurchaseOrderModal(false);
  }, [fabStackHidden, fabStackSuppressed, setShowHistoryModal]);

  useEffect(() => {
    if (!isMounted || !isPanelRendered || !isMobile) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMounted, isMobile, isPanelRendered]);

  useEffect(() => {
    if (!isMounted) return;
    if (shouldRefreshFrequentItems()) {
      queueMicrotask(() => {
        void loadFrequentItems();
      });
    }
  }, [isMounted, loadFrequentItems]);

  useEffect(() => {
    if (!isMounted || !isOpen) return;

    void refresh({ soft: hasLoadedItems });
  }, [isMounted, isOpen, refresh, hasLoadedItems]);

  useEffect(() => {
    if (showPurchaseOrderModal && isOpen) {
      void refresh();
    }
  }, [showPurchaseOrderModal, isOpen, refresh]);

  const { itemsToOrder, poSources, displayedPoItems } = useMemo(
    () => computePurchaseOrderDerivedState(items, selectedChannels),
    [items, selectedChannels],
  );

  const exportPOImage = async () => {
    const element = document.getElementById('blackandbrew-po-table-export-fab');
    if (!element) return;
    try {
      setIsExportingPO(true);
      const { captureElementAsPng, downloadPngBlob, preloadCaptureLibraries } = await import('@/lib/capture-element-png');
      preloadCaptureLibraries();
      const blob = await captureElementAsPng(element, {
        backgroundColor: '#fff3dd',
        preserveOverflow: true,
        filter: (node) => (node as HTMLElement)?.id !== 'po-action-buttons',
      });
      const channelSuffix = selectedChannels.includes('all') ? 'All' : selectedChannels.join('-');
      downloadPngBlob(
        blob,
        `PurchaseOrders-${channelSuffix}-${new Date().toISOString().split('T')[0]}.png`,
      );
    } catch (err) {
      console.error('Failed to export PO image:', err);
    } finally {
      setIsExportingPO(false);
    }
  };

  if (!isMounted) return null;

  return (
    <>
      <FabFadePresence
        visible={!hideQuickActionButton}
        presenceKey="quick-action-fab"
        className={cn(FAB_BOTTOM_QUICK_ACTION_CLASS, 'z-[201]')}
      >
        <HintTooltip tip={isPanelRendered ? 'ปิดปรับสต็อกด่วน' : 'ปรับสต็อกด่วน'} side="left">
          <motion.button
            type="button"
            onClick={toggleQuickPanel}
            className={cn(
              'flex items-center justify-center rounded-full shadow-lg',
              FAB_SIZE_CLASS,
              inventoryQuickActionTypeColors(quickAction.quickType),
              INVENTORY_QUICK_ACTION_HOVER.fab,
            )}
            whileHover={FAB_HOVER}
            whileTap={FAB_TAP}
            aria-label={isPanelRendered ? 'ปิด Quick Action' : 'เปิด Quick Action คลังสินค้า'}
            aria-expanded={isPanelRendered}
          >
          <AnimatePresence mode="wait" initial={false}>
            {isPanelRendered ? (
              <motion.span
                key="close"
                {...fabIconClose}
                transition={fabIconClose.transition}
              >
                <X size={18} strokeWidth={1.5} />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                {...fabIconOpen}
                transition={fabIconOpen.transition}
              >
                <Package size={18} strokeWidth={1.5} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
        </HintTooltip>
      </FabFadePresence>

      <AnimatePresence onExitComplete={handlePanelExitComplete}>
        {isOpen && (
          <motion.div
            key="quick-action-overlay"
            initial={fadeOverlay.initial}
            animate={fadeOverlay.animate}
            exit={fadeOverlay.exit}
            transition={fadeOverlay.transition}
            className="fixed inset-0 z-[198]"
          >
            <div
              className="absolute inset-0 bg-black/10 md:bg-black/0"
              onClick={closeQuickPanel}
              aria-hidden
            />
            <div
              className={cn(
                'z-[199] md:contents',
                'max-md:fixed max-md:inset-0',
                FAB_PANEL_CENTERED_MOBILE_WRAPPER_CLASS,
              )}
              style={mobileBackdropStyle}
            >
              <motion.div
                initial={modalContent.initial}
                animate={modalContent.animate}
                exit={modalContent.exit}
                transition={modalContent.transition}
                className={cn(
                  'pointer-events-auto box-border flex flex-col min-h-0 bg-card rounded-3xl isolate',
                  'max-md:relative max-md:w-full',
                  fabMobileBulkQueueActive
                    ? 'max-md:overflow-hidden max-md:flex max-md:flex-col'
                    : cn(FAB_MOBILE_PANEL_MAX_HEIGHT_CLASS, 'max-md:overflow-y-auto max-md:bb-smooth-scroll'),
                  fabMobileBulkFixedHeight && FAB_MOBILE_BULK_PANEL_SHELL_CLASS,
                  'max-md:transition-[max-height] max-md:duration-200',
                  'md:fixed md:z-[199] md:w-full md:max-w-2xl md:left-auto md:right-6 md:overflow-y-auto md:bb-smooth-scroll md:isolate',
                  FAB_PANEL_ABOVE_NOTIFICATION_CLASS,
                )}
                style={{ ...desktopPanelStyle, ...mobilePanelStyle }}
              >
              {isLoadingItems && !hasLoadedItems ? (
                <div className="bg-card rounded-3xl border border-border bb-shadow-xl p-8 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-foreground" strokeWidth={1.5} />
                  <span className="text-sm font-normal text-muted-foreground">กำลังโหลดข้อมูลคลังสินค้า...</span>
                </div>
              ) : (
                <InventoryQuickActionBar
                  quickSearch={quickAction.quickSearch}
                  setQuickSearch={quickAction.setQuickSearch}
                  quickQty={quickAction.quickQty}
                  setQuickQty={quickAction.setQuickQty}
                  quickType={quickAction.quickType}
                  setQuickType={quickAction.setQuickType}
                  isSearchFocused={quickAction.isSearchFocused}
                  setIsSearchFocused={quickAction.setIsSearchFocused}
                  filteredItems={quickAction.filteredItems}
                  selectedQuickItem={quickAction.selectedQuickItem}
                  quickBadgeStyles={quickAction.quickBadgeStyles}
                  frequentItems={frequentItems}
                  itemsToOrderCount={itemsToOrder.length}
                  isQuickPending={quickAction.isQuickPending}
                  isReadOnly={isReadOnly}
                  onSubmit={quickAction.handleQuickSubmit}
                  onOpenPurchaseOrder={openPurchaseOrderModal}
                  onOpenAddItem={openAddItemModal}
                  onOpenHistory={openHistoryModal}
                  bulkMode={quickAction.bulkMode}
                  onBulkModeChange={quickAction.setBulkMode}
                  bulkQueue={quickAction.bulkQueue}
                  bulkPreviews={quickAction.bulkPreviews}
                  bulkSubmitReady={quickAction.bulkSubmitReady}
                  onSelectBulkItem={quickAction.selectBulkQuickItem}
                  onAddBulkFromSearch={quickAction.addBulkItemFromSearch}
                  onRemoveBulkItem={quickAction.removeBulkItem}
                  onBulkLineQtyChange={quickAction.setBulkLineQty}
                  onClearBulkQueue={quickAction.clearBulkQueue}
                  bulkConfirmOpen={quickAction.bulkConfirmOpen}
                  bulkQuickType={quickAction.bulkQuickType}
                  onConfirmBulkSubmit={quickAction.confirmBulkSubmit}
                  onCancelBulkSubmit={quickAction.cancelBulkSubmit}
                  backfillMode={quickAction.backfillMode}
                  onBackfillModeChange={quickAction.setBackfillMode}
                  showInOutGapWarning={quickAction.showInOutGapWarning}
                  onDismissGapWarning={quickAction.dismissGapWarning}
                  transactionDateModalOpen={quickAction.transactionDateModalOpen}
                  transactionDate={quickAction.transactionDate}
                  onTransactionDateChange={quickAction.setTransactionDate}
                  transactionDateReason={quickAction.transactionDateReason}
                  onConfirmTransactionDate={quickAction.confirmTransactionDate}
                  onCancelTransactionDate={quickAction.cancelTransactionDate}
                  fabMobileBulkShell={fabMobileBulkQueueActive}
                  className="bb-shadow-xl"
                />
              )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <InventoryAddItemModal
            itemsCount={items.length}
            onClose={() => setShowAddModal(false)}
            onSuccess={(item) => {
              setItems((prev) => {
                if (prev.find((i) => i.id === item.id)) return prev;
                return [...prev, item as InventoryItem];
              });
              void loadFrequentItems();
              if (showHistoryModal) {
                void refreshHistory();
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistoryModal && (
          <InventoryHistoryModal
            transactionHistory={transactionHistory}
            onClose={() => setShowHistoryModal(false)}
            historyTypeFilter={historyTypeFilter}
            onTypeFilterChange={handleHistoryTypeFilterChange}
            onLoadMore={handleLoadMoreHistory}
            hasMoreHistory={hasMoreHistory}
            isHistoryLoading={isHistoryLoading}
            isHistoryRefreshing={isHistoryRefreshing}
            historySearchQuery={historySearchQuery}
            onSearchQueryChange={handleHistorySearchQueryChange}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPurchaseOrderModal && (
          <PurchaseOrdersModal
            onClose={() => setShowPurchaseOrderModal(false)}
            exportPOImage={exportPOImage}
            selectedChannels={selectedChannels}
            setSelectedChannels={setSelectedChannels}
            itemsToOrder={itemsToOrder}
            poSources={poSources}
            displayedPoItems={displayedPoItems}
            getStockColorClass={getStockColorClass}
          />
        )}
      </AnimatePresence>

      <ExportProgressOverlay
        visible={isExportingPO}
        title="กำลังบันทึกรูปภาพ"
        subtitle="กำลังจัดรายการสั่งซื้อ..."
      />

      {showPurchaseOrderModal && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <PurchaseOrdersModal
            isExportMode
            exportTableId="blackandbrew-po-table-export-fab"
            selectedChannels={selectedChannels}
            setSelectedChannels={() => {}}
            itemsToOrder={itemsToOrder}
            poSources={poSources}
            displayedPoItems={displayedPoItems}
            getStockColorClass={getStockColorClass}
          />
        </div>
      )}
    </>
  );
}
