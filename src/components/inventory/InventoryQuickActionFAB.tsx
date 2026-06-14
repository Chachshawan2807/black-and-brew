'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { Package, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  computeItemsToOrder,
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
import { useInventoryQuickAction } from '@/hooks/use-inventory-quick-action';
import {
  FAB_BASE_CLASS,
  FAB_BOTTOM_QUICK_ACTION_CLASS,
  FAB_PANEL_ABOVE_NOTIFICATION_CLASS,
} from '@/lib/floating-action-layout';
import { getFabPanelKeyboardAwareStyle } from '@/lib/keyboard-aware-panel-style';
import { useVisualViewportInsets } from '@/hooks/use-visual-viewport-insets';
import { useFloatingOverlay } from '@/components/floating/FloatingOverlayContext';
import { useReadOnly } from '@/components/providers/AuthProvider';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { ExportProgressOverlay } from '@/components/ui/ExportProgressOverlay';
import { InventoryQuickActionBar } from './InventoryQuickActionBar';
import { InventoryHistoryModal } from './InventoryHistoryModal';
import { InventoryAddItemModal } from './InventoryAddItemModal';

const PurchaseOrdersModal = dynamic(() => import('@/app/[locale]/inventory/PurchaseOrdersModal'), { ssr: false });

type InventoryItem = InventoryRealtimeItem & InventoryStockFields;

export default function InventoryQuickActionFAB() {
  const isReadOnly = useReadOnly();
  const { fabStackHidden, isAnyOtherOpen, setOverlayOpen } = useFloatingOverlay();
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
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
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

  const quickAction = useInventoryQuickAction({
    items,
    setItems,
    isReadOnly,
    showHistoryModal,
    onHistoryRefresh: setTransactionHistory,
    onAfterSave: () => {
      void loadFrequentItems();
    },
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const quickOverlayActive =
    isOpen || showAddModal || showHistoryModal || showPurchaseOrderModal;
  const hideQuickActionButton =
    fabStackHidden ||
    isAnyOtherOpen('quick-action') ||
    showAddModal ||
    showHistoryModal ||
    showPurchaseOrderModal;

  useEffect(() => {
    setOverlayOpen('quick-action', quickOverlayActive);
  }, [quickOverlayActive, setOverlayOpen]);

  useEffect(() => {
    if (!fabStackHidden) return;
    setIsOpen(false);
    setShowAddModal(false);
    setShowHistoryModal(false);
    setShowPurchaseOrderModal(false);
  }, [fabStackHidden]);

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

  const itemsToOrder = useMemo(() => computeItemsToOrder(items), [items]);

  const poSources = useMemo(() => {
    const sources = new Set<string>();
    itemsToOrder.forEach((item) => {
      sources.add(item.source || 'ไม่ได้ระบุแหล่งที่มา');
    });
    return Array.from(sources);
  }, [itemsToOrder]);

  const displayedPoItems = useMemo(() => {
    if (selectedChannels.includes('all')) return itemsToOrder;
    return itemsToOrder.filter((i) => selectedChannels.includes(i.source || 'ไม่ได้ระบุแหล่งที่มา'));
  }, [itemsToOrder, selectedChannels]);

  const handleOpenHistory = useCallback(async () => {
    setTransactionHistory([]);
    setShowHistoryModal(true);
    const res = await fetchTransactionHistory();
    if (res.success && res.data) {
      setTransactionHistory(res.data);
    } else if (res.error) {
      console.error('[UI] History fetch failed:', res.error);
    }
  }, []);

  const exportPOImage = async () => {
    const element = document.getElementById('blackandbrew-po-table-export-fab');
    if (!element) return;
    try {
      setIsExportingPO(true);
      const fullHeight = element.scrollHeight;
      const fullWidth = element.scrollWidth;

      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#fff3dd',
        width: fullWidth,
        height: fullHeight,
        style: {
          margin: '0',
          padding: '0',
          border: 'none',
          boxShadow: 'none',
          maxHeight: 'none',
          overflow: 'hidden',
        },
        filter: (node) => {
          if ((node as HTMLElement)?.id === 'po-action-buttons') {
            return false;
          }
          return true;
        },
      });
      const channelSuffix = selectedChannels.includes('all') ? 'All' : selectedChannels.join('-');
      const link = document.createElement('a');
      link.download = `PurchaseOrders-${channelSuffix}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export PO image:', err);
    } finally {
      setIsExportingPO(false);
    }
  };

  if (!isMounted) return null;

  return (
    <>
      {!hideQuickActionButton && (
        <HintTooltip tip={isOpen ? 'ปิดปรับสต็อกด่วน' : 'ปรับสต็อกด่วน'} side="left">
          <motion.button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={cn(FAB_BASE_CLASS, FAB_BOTTOM_QUICK_ACTION_CLASS, 'z-[201]')}
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
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="quick-action-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[198] bg-black/10 md:bg-black/0"
            />
            <motion.div
              key="quick-action-panel"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
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
                void fetchTransactionHistory().then((histRes) => {
                  if (histRes.success && histRes.data) {
                    setTransactionHistory(histRes.data);
                  }
                });
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistoryModal && (
          <InventoryHistoryModal transactionHistory={transactionHistory} onClose={() => setShowHistoryModal(false)} />
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
