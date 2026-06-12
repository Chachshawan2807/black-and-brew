'use client';

import type React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownToLine, ShoppingCart, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeOverlay, modalContent } from '@/lib/motion-presets';
import { PASTEL_SURFACE } from '@/lib/shift-colors';

type PurchaseOrderItem = {
  id: string;
  name: string;
  stock: number;
  target_stock: number;
  computedOrderQty: number;
  unit: string;
  source?: string | null;
  updated_at?: string;
};

type PurchaseOrdersModalProps = {
  onClose?: () => void;
  exportPOImage?: () => Promise<void>;
  selectedChannels?: string[];
  setSelectedChannels?: React.Dispatch<React.SetStateAction<string[]>>;
  itemsToOrder: PurchaseOrderItem[];
  poSources: string[];
  displayedPoItems: PurchaseOrderItem[];
  getStockColorClass: (stock: number, targetStock: number) => string;
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
  isExportMode = false,
  exportTableId = 'blackandbrew-po-table-export',
}: PurchaseOrdersModalProps) {
  const itemsToShow = displayedPoItems;
  const tableId = isExportMode ? exportTableId : 'blackandbrew-po-table';

  const tableContent = (
    <div id={tableId} className={isExportMode ? "relative flex flex-col w-full bg-card" : "relative max-h-[75vh] overflow-y-auto flex flex-col w-full bg-card"}>
      {/* STICKY STYLED WRAPPER FOR THE HEADER */}
        <div className={cn(
          PASTEL_SURFACE,
          "bg-[#fff3dd] pt-4 pb-4 w-full box-border border-b border-black/5 shadow-sm",
          !isExportMode && "sticky top-0 z-30",
        )}>
          {!isExportMode && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-black/40 hover:text-black hover:bg-black/5 rounded-full transition-colors z-40"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="px-6 flex items-center justify-between mb-4 pr-14">
            <h2 className="text-xl font-normal flex items-center gap-2 antialiased">
              <ShoppingCart className="w-5 h-5 opacity-60" /> รายการสั่งซื้อ
              {isExportMode && !selectedChannels.includes('all') && (
                <span className="text-base opacity-50 font-normal">
                  — {selectedChannels.join(', ')}
                </span>
              )}
            </h2>

            {!isExportMode && (
              <div id="po-action-buttons" className="flex items-center gap-3">
                <button
                  onClick={exportPOImage}
                  className="px-4 py-2 bg-white/80 hover:bg-white text-black/85 text-[14px] rounded-full flex items-center gap-2 transition-colors border border-black/10 shadow-sm antialiased font-normal"
                >
                  <ArrowDownToLine className="w-4 h-4" /> บันทึกเป็นรูปภาพ
                </button>
              </div>
            )}
          </div>

        {/* Tabs Navigation - only show in non-export mode */}
        {!isExportMode && (
          <div className="px-6">
            <div className="flex flex-wrap gap-2.5 items-center overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setSelectedChannels(['all'])}
                className={cn(
                  'px-4 py-2 text-[14px] rounded-full border transition-all duration-200 antialiased cursor-pointer font-normal whitespace-nowrap',
                  selectedChannels.includes('all')
                    ? 'bg-[#000000] border-[#000000] text-white shadow-sm'
                    : 'border-black/15 bg-transparent text-black/85 hover:bg-black/5',
                )}
              >
                ทั้งหมด{' '}
                <span className={selectedChannels.includes('all') ? 'text-white/60 text-[12px] ml-1 font-mono font-normal' : 'text-black/50 text-[12px] ml-1 font-mono font-normal'}>
                  ({itemsToOrder.length})
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
                      'px-4 py-2 text-[14px] rounded-full border transition-all duration-200 antialiased cursor-pointer font-normal whitespace-nowrap',
                      isActive
                        ? 'bg-[#000000] border-[#000000] text-white shadow-sm'
                        : 'border-black/15 bg-transparent text-black/85 hover:bg-black/5',
                    )}
                  >
                    {source}{' '}
                    <span className={isActive ? 'text-white/60 text-[12px] ml-1 font-mono font-normal' : 'text-black/50 text-[12px] ml-1 font-mono font-normal'}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tab Content (Direct Sibling) */}
      <div className="p-6">
        {itemsToShow.length === 0 ? (
          <div className={cn(
            "py-16 flex flex-col items-center justify-center rounded-3xl border shadow-sm",
            isExportMode
              ? "text-black/40 bg-white border-black/5"
              : "text-muted-foreground bg-card border-border",
          )}>
            <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-[15px]">ไม่มีรายการสั่งซื้อ</p>
          </div>
        ) : (
          <div className={cn(
            "rounded-3xl shadow-sm border",
            isExportMode
              ? "bg-white border-black/5"
              : "bg-card border-border overflow-auto max-h-[calc(85vh-220px)] scrollbar-thin",
          )}>
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className={isExportMode ? "border-b border-black/5" : "border-b border-border"}>
                  <th className={cn(
                    "py-4 font-normal text-[13px] w-12 text-center border-r",
                    isExportMode
                      ? "bg-slate-50/90 text-black/40 border-black/5"
                      : "sticky top-0 bg-muted backdrop-blur-sm text-muted-foreground border-border z-10",
                  )}>#</th>
                  <th className={cn(
                    "py-4 font-normal text-[13px] text-left pl-4 border-r",
                    isExportMode
                      ? "bg-slate-50/90 text-black/40 border-black/5"
                      : "sticky top-0 bg-muted backdrop-blur-sm text-muted-foreground border-border z-10",
                  )}>ชื่อรายการ</th>
                  <th className={cn(
                    "py-4 font-normal text-[13px] text-center w-32 border-r",
                    isExportMode
                      ? "bg-slate-50/90 text-black/40 border-black/5"
                      : "sticky top-0 bg-muted backdrop-blur-sm text-muted-foreground border-border z-10",
                  )}>จำนวนสั่งซื้อ</th>
                  <th className={cn(
                    "py-4 font-normal text-[13px] text-center w-24 border-r",
                    isExportMode
                      ? "bg-slate-50/90 text-black/40 border-black/5"
                      : "sticky top-0 bg-muted backdrop-blur-sm text-muted-foreground border-border z-10",
                  )}>คงเหลือ</th>
                  <th className={cn(
                    "py-4 font-normal text-[13px] w-24 text-center border-r",
                    isExportMode
                      ? "bg-slate-50/90 text-black/40 border-black/5"
                      : "sticky top-0 bg-muted backdrop-blur-sm text-muted-foreground border-border z-10",
                  )}>หน่วย</th>
                  <th className={cn(
                    "py-4 font-normal text-[13px] w-32 text-center",
                    isExportMode
                      ? "bg-slate-50/90 text-black/40"
                      : "sticky top-0 bg-muted backdrop-blur-sm text-muted-foreground z-10",
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
                      "py-4 text-[14px] text-center border-r",
                      isExportMode ? "text-black/30 border-black/5" : "text-muted-foreground border-border",
                    )}>{idx + 1}</td>
                    <td className={cn(
                      "py-4 text-[15px] font-normal text-left pl-4 border-r",
                      isExportMode ? "text-black border-black/5" : "text-foreground border-border",
                    )}>{item.name}</td>
                    <td className={cn(
                      "py-4 text-[16px] text-center font-mono font-normal border-r",
                      isExportMode ? "text-black border-black/5" : "text-foreground border-border",
                    )}>
                      {Number.isInteger(item.computedOrderQty) ? item.computedOrderQty : Number(item.computedOrderQty).toFixed(1)}
                    </td>
                    <td
                      className={cn(
                        "py-4 text-[15px] text-center font-mono border-r",
                        isExportMode ? "border-black/5" : "border-border",
                        getStockColorClass(Number(item.stock) || 0, Number(item.target_stock) || 0),
                      )}
                    >
                      {Number.isInteger(item.stock) ? item.stock : Number(item.stock).toFixed(1)}
                    </td>
                    <td className={cn(
                      "py-4 text-[14px] text-center border-r",
                      isExportMode ? "text-black/50 border-black/5" : "text-muted-foreground border-border",
                    )}>{item.unit || '-'}</td>
                    <td className={cn(
                      "py-4 text-[13px] text-center font-mono",
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
    <motion.div
      initial={fadeOverlay.initial}
      animate={fadeOverlay.animate}
      exit={fadeOverlay.exit}
      transition={fadeOverlay.transition}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/20 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={modalContent.initial}
        animate={modalContent.animate}
        exit={modalContent.exit}
        transition={modalContent.transition}
        className="bg-card rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.1)] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {tableContent}
      </motion.div>
    </motion.div>
  );
}
