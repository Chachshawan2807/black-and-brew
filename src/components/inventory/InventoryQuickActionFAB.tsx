'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { Package, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeOverlay, modalContent } from '@/lib/motion-presets';
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
  fetchTransactionHistory,
  fetchFrequentItems,
} from '@/app/actions/inventory-actions';
import type { InventoryTransactionFilterType } from '@/app/actions/inventory-actions';
import { useInventoryQuickAction } from '@/hooks/use-inventory-quick-action';
import { INVENTORY_NOTIFICATION_SOURCES } from '@/lib/inventory-notification-filter';
import {
  FAB_STACK_INNER_CLASS,
  FAB_BOTTOM_QUICK_ACTION_CLASS,
  FAB_PANEL_ABOVE_NOTIFICATION_CLASS,
} from '@/lib/floating-action-layout';
import { getFabPanelKeyboardAwareStyle } from '@/lib/keyboard-aware-panel-style';
import { useVisualViewportInsets } from '@/hooks/use-visual-viewport-insets';
import { FabFadePresence } from '@/components/floating/FabFadePresence';
import { useFloatingOverlay } from '@/components/floating/FloatingOverlayContext';
import { useReadOnly } from '@/components/providers/AuthProvider';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { ExportProgressOverlay } from '@/components/ui/ExportProgressOverlay';
import { InventoryQuickActionBar } from './InventoryQuickActionBar';
import { InventoryHistoryModal, type TransactionHistoryRow } from './InventoryHistoryModal';
import { InventoryAddItemModal } from './InventoryAddItemModal';

const PurchaseOrdersModal = dynamic(() => import('@/app/[locale]/inventory/PurchaseOrdersModal'), { ssr: false });

const HISTORY_PAGE_SIZE = 50;

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
  const [frequentItems, setFrequentItems] = useState<{ id: string; name: string }[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistoryRow[]>([]);
  const [historyTypeFilter, setHistoryTypeFilter] = useState<InventoryTransactionFilterType>('ALL');
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['all']);
  const [isExportingPO, setIsExportingPO] = useState(false);

  const viewportInsets = useVisualViewportInsets(isMounted && isOpen);
  const quickPanelStyle = getFabPanelKeyboardAwareStyle({ insets: viewportInsets });

  const loadFrequentItems = useCallback(async () => {
    const res = await fetchFrequentItems();
    if (res.success && res.data) {
      setFrequentItems(res.data);
    }
  }, []);

  const loadHistoryPage = useCallback(
    async ({
      type = historyTypeFilter,
      offset = 0,
      append = false,
    }: {
      type?: InventoryTransactionFilterType;
      offset?: number;
      append?: boolean;
    } = {}) => {
      setIsHistoryLoading(true);
      try {
        const res = await fetchTransactionHistory({
          type,
          offset,
          limit: HISTORY_PAGE_SIZE,
        });
        if (res.success && res.data) {
          setTransactionHistory((prev) => (append ? [...prev, ...res.data] : res.data));
          setHasMoreHistory(Boolean(res.hasMore));
        } else if (res.error) {
          console.error('[UI] History fetch failed:', res.error);
          setHasMoreHistory(false);
        }
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [historyTypeFilter],
  );

  const quickAction = useInventoryQuickAction({
    items,
    setItems,
    isReadOnly,
    showHistoryModal,
    onHistoryRefresh: () => loadHistoryPage({ offset: 0 }),
    notificationSource: INVENTORY_NOTIFICATION_SOURCES.QUICK_ACTION_FAB,
    onAfterSave: () => {
      void loadFrequentItems();
      setIsOpen(false);
    },
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const quickOverlayActive =
    isOpen || showAddModal || showHistoryModal || showPurchaseOrderModal;
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
    setIsOpen(false);
    setShowAddModal(false);
    setShowHistoryModal(false);
    setShowPurchaseOrderModal(false);
  }, [fabStackHidden, fabStackSuppressed]);

  useEffect(() => {
    if (!isMounted || !isOpen) return;

    void refresh();
    void loadFrequentItems();
  }, [isMounted, isOpen, refresh, loadFrequentItems]);

  useEffect(() => {
    if (showPurchaseOrderModal && isOpen) {
      void refresh();
    }
  }, [showPurchaseOrderModal, isOpen, refresh]);

  const { itemsToOrder, poSources, displayedPoItems } = useMemo(
    () => computePurchaseOrderDerivedState(items, selectedChannels),
    [items, selectedChannels],
  );

  const handleOpenHistory = useCallback(async () => {
    setTransactionHistory([]);
    setHistoryTypeFilter('ALL');
    setHasMoreHistory(false);
    setShowHistoryModal(true);
    await loadHistoryPage({ type: 'ALL', offset: 0 });
  }, [loadHistoryPage]);

  const handleHistoryTypeFilterChange = useCallback(
    (nextType: InventoryTransactionFilterType) => {
      setHistoryTypeFilter(nextType);
      setTransactionHistory([]);
      setHasMoreHistory(false);
      void loadHistoryPage({ type: nextType, offset: 0 });
    },
    [loadHistoryPage],
  );

  const handleLoadMoreHistory = useCallback(() => {
    if (isHistoryLoading || !hasMoreHistory) return;
    void loadHistoryPage({ offset: transactionHistory.length, append: true });
  }, [hasMoreHistory, isHistoryLoading, loadHistoryPage, transactionHistory.length]);

  const exportPOImage = async () => {
    const element = document.getElementById('blackandbrew-po-table-export-fab');
    if (!element) return;
    try {
      setIsExportingPO(true);
      const { captureElementAsPng, downloadDataUrl } = await import('@/lib/capture-element-png');
      const dataUrl = await captureElementAsPng(element, {
        backgroundColor: '#fff3dd',
        preserveOverflow: true,
        filter: (node) => (node as HTMLElement)?.id !== 'po-action-buttons',
      });
      const channelSuffix = selectedChannels.includes('all') ? 'All' : selectedChannels.join('-');
      downloadDataUrl(
        dataUrl,
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
        <HintTooltip tip={isOpen ? 'ปิดปรับสต็อกด่วน' : 'ปรับสต็อกด่วน'} side="left">
          <motion.button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={FAB_STACK_INNER_CLASS}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            aria-label={isOpen ? 'ปิด Quick Action' : 'เปิด Quick Action คลังสินค้า'}
            aria-expanded={isOpen}
          >
          <AnimatePresence mode="wait" initial={false}>
            {isOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X size={18} strokeWidth={1.5} />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Package size={18} className="text-white" strokeWidth={1.5} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
        </HintTooltip>
      </FabFadePresence>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="quick-action-backdrop"
              initial={fadeOverlay.initial}
              animate={fadeOverlay.animate}
              exit={fadeOverlay.exit}
              transition={fadeOverlay.transition}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[198] bg-black/10 md:bg-black/0"
            />
            <motion.div
              key="quick-action-panel"
              initial={modalContent.initial}
              animate={modalContent.animate}
              exit={modalContent.exit}
              transition={modalContent.transition}
              className={cn(
                'fixed z-[199] box-border flex flex-col overflow-visible',
                'max-md:left-[calc(1rem+env(safe-area-inset-left,0px))] max-md:right-[calc(1rem+env(safe-area-inset-right,0px))] max-md:w-auto max-md:max-w-none',
                'max-md:transition-[top,max-height,bottom] max-md:duration-200',
                'md:w-full md:max-w-2xl md:left-auto md:right-6',
                FAB_PANEL_ABOVE_NOTIFICATION_CLASS,
              )}
              style={quickPanelStyle}
            >
              {isLoadingItems && !hasLoadedItems ? (
                <div className="bg-card rounded-3xl border border-border shadow-2xl p-8 flex flex-col items-center justify-center gap-3">
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
                  onOpenPurchaseOrder={() => setShowPurchaseOrderModal(true)}
                  onOpenAddItem={() => setShowAddModal(true)}
                  onOpenHistory={() => void handleOpenHistory()}
                  bulkMode={quickAction.bulkMode}
                  onBulkModeChange={quickAction.setBulkMode}
                  bulkQueue={quickAction.bulkQueue}
                  bulkPreviews={quickAction.bulkPreviews}
                  bulkSubmitReady={quickAction.bulkSubmitReady}
                  onSelectBulkItem={quickAction.selectBulkQuickItem}
                  onAddBulkFromSearch={quickAction.addBulkItemFromSearch}
                  onBulkPaste={quickAction.handleBulkPaste}
                  onRemoveBulkItem={quickAction.removeBulkItem}
                  onBulkLineQtyChange={quickAction.setBulkLineQty}
                  onClearBulkQueue={quickAction.clearBulkQueue}
                  className="shadow-2xl"
                />
              )}
            </motion.div>
          </>
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
                void loadHistoryPage({ offset: 0 });
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
