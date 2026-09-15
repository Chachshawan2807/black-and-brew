'use client';

import { useState } from 'react';
import { preloadCaptureLibraries } from '@/lib/capture-element-png';
import { motion } from 'framer-motion';
import { CloseIcon } from '@/components/ui/close-icon';
import { AlertCircle, CheckCircle2, Copy, ImageDown, ShoppingCart } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { fadeOverlay, modalContent } from '@/lib/motion-presets';
import { PASTEL_SURFACE } from '@/lib/shift-colors';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { FloatingAlert } from '@/components/ui/floating-alert';
import { INVENTORY_MODAL_Z_CLASS } from '@/lib/floating-action-layout';
import { useVisualViewportInsets } from '@/hooks/use-visual-viewport-insets';
import {
  getModalBackdropKeyboardAwareStyle,
  getModalContentKeyboardAwareStyle,
} from '@/lib/keyboard-aware-panel-style';
import { formatPurchaseOrderListCopyText } from '@/lib/inventory-purchase-order-copy-text';
import type { PurchaseOrderCandidate } from '@/lib/inventory-stock';
import { InventoryModalPortal } from './InventoryModalPortal';
import {
  BB_BTN_MOTION,
  BB_CHIP_IDLE_ON_PASTEL,
  BB_CHIP_SELECTED_ON_PASTEL,
} from '@/lib/ui-outlined-tokens';

const PO_FILTER_CHIP =
  'shrink-0 px-2.5 py-1.5 sm:px-4 sm:py-2 text-[12px] sm:text-[14px] rounded-xl sm:rounded-2xl border bb-transition antialiased cursor-pointer font-normal whitespace-nowrap touch-manipulation';

const PO_FILTER_COUNT = 'text-muted-foreground text-[10px] sm:text-[12px] ml-1 tabular-nums font-normal';

const PO_ICON_BTN = cn(
  'inline-flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border-0 bg-transparent text-black/45 hover:text-black hover:bg-black/5',
  BB_BTN_MOTION,
  'max-sm:h-9 max-sm:w-9 max-sm:min-h-9 max-sm:min-w-9',
);

type CopyToast = {
  message: string;
  x: number;
  y: number;
  type: 'success' | 'error';
};

type PurchaseOrdersModalProps = {
  onClose?: () => void;
  exportPOImage?: () => Promise<void>;
  selectedChannels?: string[];
  setSelectedChannels?: React.Dispatch<React.SetStateAction<string[]>>;
  itemsToOrder: PurchaseOrderCandidate[];
  poSources: string[];
  displayedPoItems: PurchaseOrderCandidate[];
  getStockColorClass: (stock: number, orderPoint: number) => string;
  allTabItemCount?: number;
  isExportMode?: boolean;
  exportTableId?: string;
};

export default function PurchaseOrdersModal({
  onClose,
  exportPOImage,
  selectedChannels = ['all'],
  setSelectedChannels = () => {},
  itemsToOrder,
  poSources,
  displayedPoItems,
  getStockColorClass,
  allTabItemCount,
  isExportMode = false,
  exportTableId = 'blackandbrew-po-table-export',
}: PurchaseOrdersModalProps) {
  const [copyToast, setCopyToast] = useState<CopyToast | null>(null);
  const viewportInsets = useVisualViewportInsets(!isExportMode);
  const modalBackdropStyle = getModalBackdropKeyboardAwareStyle({
    insets: viewportInsets,
    verticalAlign: 'center',
  });
  const modalContentStyle = getModalContentKeyboardAwareStyle({ insets: viewportInsets });
  const itemsToShow = displayedPoItems;
  const totalTabCount = allTabItemCount ?? itemsToOrder.length;
  const tableId = isExportMode ? exportTableId : 'blackandbrew-po-table';

  async function handleCopyList(event: React.MouseEvent<HTMLButtonElement>) {
    const anchor = { x: event.clientX, y: event.clientY };

    if (itemsToShow.length === 0) {
      setCopyToast({ message: 'ไม่มีรายการให้คัดลอก', ...anchor, type: 'error' });
      return;
    }

    try {
      await navigator.clipboard.writeText(formatPurchaseOrderListCopyText(itemsToShow));
      setCopyToast({ message: 'คัดลอกแล้ว', ...anchor, type: 'success' });
    } catch {
      setCopyToast({ message: 'คัดลอกไม่สำเร็จ', ...anchor, type: 'error' });
    }
  }

  const tableContent = (
    <div
      id={tableId}
      className={
        isExportMode
          ? "relative flex flex-col w-full bg-[#fff3dd] rounded-2xl overflow-hidden"
          : 'relative flex flex-col flex-1 min-h-0 overflow-hidden w-full bg-card'
      }
    >
      {/* Header + channel filters fixed above the single scroll region */}
        <div className={cn(
          PASTEL_SURFACE,
          'bg-[#fff3dd] pt-3 pb-3 sm:pt-4 sm:pb-4 w-full shrink-0 box-border border-b border-black/5 bb-shadow-sm',
        )}>
          {!isExportMode && (
            <div id="po-action-buttons" className="absolute top-3 right-3 sm:top-4 sm:right-4 z-40 flex items-center gap-0.5 sm:gap-1">
              <HintTooltip tip="คัดลอกรายการ">
                <button
                  type="button"
                  onClick={(event) => void handleCopyList(event)}
                  className={PO_ICON_BTN}
                  aria-label="คัดลอกรายการ"
                >
                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden />
                </button>
              </HintTooltip>
              <HintTooltip tip="บันทึกเป็นรูปภาพ">
                <button
                  type="button"
                  onClick={exportPOImage}
                  onMouseEnter={preloadCaptureLibraries}
                  onFocus={preloadCaptureLibraries}
                  className={PO_ICON_BTN}
                  aria-label="บันทึกเป็นรูปภาพ"
                >
                  <ImageDown className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.75} aria-hidden />
                </button>
              </HintTooltip>
              <HintTooltip tip="ปิดรายการสั่งซื้อ">
                <button
                  type="button"
                  onClick={onClose}
                  className={PO_ICON_BTN}
                  aria-label="ปิดรายการสั่งซื้อ"
                >
                  <CloseIcon size="sm" className="sm:hidden" />
                  <CloseIcon className="hidden sm:block" />
                </button>
              </HintTooltip>
            </div>
          )}
          <div className="px-4 sm:px-6 flex items-center mb-2 sm:mb-4 pr-[7.25rem] sm:pr-32">
            <h2 className="text-lg sm:text-xl font-normal flex items-center gap-1.5 sm:gap-2 antialiased whitespace-nowrap">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 opacity-60" /> รายการสั่งซื้อ
              {isExportMode && !selectedChannels.includes('all') && (
                <span className="text-base opacity-50 font-normal"> {selectedChannels.join(', ')}
                </span>
              )}
            </h2>
          </div>

        {/* Tabs Navigation - only show in non-export mode */}
        {!isExportMode && (
          <div className="px-4 sm:px-6">
            <div className="flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-2.5 items-center overflow-x-auto bb-smooth-scroll bb-smooth-scroll-chain-y -mx-1 px-1 sm:mx-0 sm:px-0">
              <button
                onClick={() => setSelectedChannels(['all'])}
                className={cn(
                  PO_FILTER_CHIP,
                  selectedChannels.includes('all')
                    ? BB_CHIP_SELECTED_ON_PASTEL
                    : BB_CHIP_IDLE_ON_PASTEL,
                )}
              >
                ทั้งหมด{' '}
                <span className={PO_FILTER_COUNT}>
                  ({totalTabCount})
                </span>
              </button>
              {poSources.map((source) => {
                const count = itemsToOrder.filter((i) => (i.source || 'ไม่ได้ระบุแหล่งที่มา') === source).length;
                const isActive = selectedChannels.includes(source) && !selectedChannels.includes('all');
                return (
                  <button
                    key={source}
                    onClick={() => {
                      setSelectedChannels((prev) => {
                        let next = prev.filter((c) => c !== 'all');
                        if (next.includes(source)) {
                          next = next.filter((c) => c !== source);
                        } else {
                          next = [...next, source];
                        }
                        return next.length === 0 ? ['all'] : next;
                      });
                    }}
                    className={cn(
                      PO_FILTER_CHIP,
                      isActive
                        ? BB_CHIP_SELECTED_ON_PASTEL
                        : BB_CHIP_IDLE_ON_PASTEL,
                    )}
                  >
                    {source}{' '}
                    <span className={PO_FILTER_COUNT}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Table body scroll (vertical + horizontal) only inside the table area */}
      <div
        className={
          isExportMode
            ? 'p-6'
            : 'flex flex-1 min-h-0 flex-col overflow-hidden p-3 sm:p-6'
        }
      >
        {itemsToShow.length === 0 ? (
          <div className={cn(
            "py-16 flex flex-col items-center justify-center rounded-2xl border bb-shadow-sm",
            isExportMode
              ? "text-black/40 bg-white border-black/5"
              : "text-muted-foreground bg-card border-border",
          )}>
            <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-[15px]">ไม่มีรายการสั่งซื้อ</p>
          </div>
        ) : (
          <div className={cn(
            "rounded-2xl bb-shadow-sm border min-h-0",
            isExportMode
              ? "bg-white border-black/5 overflow-hidden"
              : "flex-1 bg-card border-border overflow-auto bb-smooth-scroll bb-smooth-scroll-chain-y",
          )}>
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className={isExportMode ? "border-b border-black/5" : "border-b border-border"}>
                  <th className={cn(
                    "py-2 sm:py-4 font-normal text-[12px] sm:text-[13px] w-12 text-center border-r",
                    isExportMode
                      ? "bg-slate-50/90 text-black/40 border-black/5"
                      : "sticky top-0 bg-card text-muted-foreground border-border z-10",
                  )}>#</th>
                  <th className={cn(
                    "py-2 sm:py-4 font-normal text-[12px] sm:text-[13px] text-left pl-3 sm:pl-4 border-r max-w-[10.5rem] w-[10.5rem]",
                    isExportMode
                      ? "bg-slate-50/90 text-black/40 border-black/5"
                      : "sticky top-0 bg-card text-muted-foreground border-border z-10",
                  )}>รายการ</th>
                  <th className={cn(
                    "py-2 sm:py-4 font-normal text-[12px] sm:text-[13px] text-center w-32 border-r",
                    isExportMode
                      ? "bg-slate-50/90 text-black/40 border-black/5"
                      : "sticky top-0 bg-card text-muted-foreground border-border z-10",
                  )}>จำนวนสั่งซื้อ</th>
                  <th className={cn(
                    "py-2 sm:py-4 font-normal text-[12px] sm:text-[13px] text-center w-24 border-r",
                    isExportMode
                      ? "bg-slate-50/90 text-black/40 border-black/5"
                      : "sticky top-0 bg-card text-muted-foreground border-border z-10",
                  )}>คงเหลือ</th>
                  <th className={cn(
                    "py-2 sm:py-4 font-normal text-[12px] sm:text-[13px] w-24 text-center border-r",
                    isExportMode
                      ? "bg-slate-50/90 text-black/40 border-black/5"
                      : "sticky top-0 bg-card text-muted-foreground border-border z-10",
                  )}>หน่วย</th>
                  <th className={cn(
                    "py-2 sm:py-4 font-normal text-[12px] sm:text-[13px] w-32 text-center",
                    isExportMode
                      ? "bg-slate-50/90 text-black/40"
                      : "sticky top-0 bg-card text-muted-foreground z-10",
                  )}>อัปเดตล่าสุด</th>
                </tr>
              </thead>
              <tbody>
                {itemsToShow.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b last:border-0 transition-colors",
                      isExportMode
                        ? "border-black/5 hover:bg-[#000000]/5"
                        : "border-border hover:bg-muted/50",
                    )}
                  >
                    <td className={cn(
                      "py-2 sm:py-4 text-[13px] sm:text-[14px] text-center border-r",
                      isExportMode ? "text-black/30 border-black/5" : "text-muted-foreground border-border",
                    )}>{idx + 1}</td>
                    <td className={cn(
                      "py-2 sm:py-4 text-[14px] sm:text-[15px] font-normal text-left pl-3 sm:pl-4 border-r max-w-[10.5rem] w-[10.5rem] truncate",
                      isExportMode ? "text-black border-black/5" : "text-foreground border-border",
                    )}>{item.name}</td>
                    <td className={cn(
                      "py-2 sm:py-4 text-[14px] sm:text-[16px] text-center tabular-nums font-normal border-r",
                      isExportMode ? "text-black border-black/5" : "text-foreground border-border",
                    )}>
                      {Number.isInteger(item.computedOrderQty) ? item.computedOrderQty : Number(item.computedOrderQty).toFixed(1)}
                    </td>
                    <td
                      className={cn(
                        "py-2 sm:py-4 text-[14px] sm:text-[15px] text-center tabular-nums border-r",
                        isExportMode ? "border-black/5" : "border-border",
                        getStockColorClass(Number(item.stock) || 0, Number(item.order_point) || 0),
                      )}
                    >
                      {Number.isInteger(item.stock) ? item.stock : Number(item.stock).toFixed(1)}
                    </td>
                    <td className={cn(
                      "py-2 sm:py-4 text-[13px] sm:text-[14px] text-center border-r",
                      isExportMode ? "text-black/50 border-black/5" : "text-muted-foreground border-border",
                    )}>{item.unit || '-'}</td>
                    <td className={cn(
                      "py-2 sm:py-4 text-[12px] sm:text-[13px] text-center tabular-nums",
                      isExportMode ? "text-black/40" : "text-muted-foreground",
                    )}>
                      {item.updated_at
                        ? new Date(item.updated_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok' })
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  if (isExportMode) {
    return tableContent;
  }

  return (
    <InventoryModalPortal>
      {copyToast ? (
        <FloatingAlert
          message={copyToast.message}
          anchor={{ x: copyToast.x, y: copyToast.y }}
          icon={
            copyToast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
            )
          }
          onDismiss={() => setCopyToast(null)}
        />
      ) : null}
      <motion.div
        initial={fadeOverlay.initial}
        animate={fadeOverlay.animate}
        exit={fadeOverlay.exit}
        transition={fadeOverlay.transition}
        className={cn(
          'fixed inset-0 overflow-y-auto overscroll-contain bb-smooth-scroll bg-black/20 backdrop-blur-md',
          INVENTORY_MODAL_Z_CLASS,
        )}
        style={modalBackdropStyle}
        onClick={onClose}
      >
        <div className="flex min-h-full min-w-0 items-center justify-center p-4">
          <motion.div
            initial={modalContent.initial}
            animate={modalContent.animate}
            exit={modalContent.exit}
            transition={modalContent.transition}
            className="my-auto flex min-h-0 w-full max-w-4xl max-h-[85svh] flex-col overflow-hidden rounded-2xl bg-card bb-shadow-xl"
            style={modalContentStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {tableContent}
          </motion.div>
        </div>
      </motion.div>
    </InventoryModalPortal>
  );
}
