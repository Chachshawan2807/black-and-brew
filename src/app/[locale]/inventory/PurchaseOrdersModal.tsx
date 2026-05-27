'use client';

import type React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownToLine, ShoppingCart, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type PurchaseOrderItem = {
  id: string;
  name: string;
  stock: any;
  target_stock: any;
  computedOrderQty: any;
  unit: string;
  source?: string | null;
  updated_at?: string;
};

type PurchaseOrdersModalProps = {
  onClose: () => void;
  exportPOImage: () => Promise<void>;
  selectedChannels: string[];
  setSelectedChannels: React.Dispatch<React.SetStateAction<string[]>>;
  itemsToOrder: PurchaseOrderItem[];
  poSources: string[];
  displayedPoItems: PurchaseOrderItem[];
  getStockColorClass: (stock: number, targetStock: number) => string;
};

export default function PurchaseOrdersModal({
  onClose,
  exportPOImage,
  selectedChannels,
  setSelectedChannels,
  itemsToOrder,
  poSources,
  displayedPoItems,
  getStockColorClass,
}: PurchaseOrdersModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/20 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-[#fdfcf0] rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.1)] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div id="blackandbrew-po-table" className="relative max-h-[75vh] overflow-y-auto flex flex-col w-full bg-[#fdfcf0]">
          {/* STICKY STYLED WRAPPER FOR THE HEADER */}
          <div className="sticky top-0 bg-[#fff3dd] z-30 pt-4 pb-4 w-full box-border border-b border-black/5 shadow-sm">
            <div className="px-6 flex items-center justify-between mb-4">
              <h2 className="text-xl font-normal text-[#000000] flex items-center gap-2 antialiased">
                <ShoppingCart className="w-5 h-5 text-black/60" /> รายการสั่งซื้อ
              </h2>

              <div id="po-action-buttons" className="flex items-center gap-3">
                <button
                  onClick={exportPOImage}
                  className="px-4 py-2 bg-white hover:bg-neutral-50 text-[#000000] text-[14px] rounded-full flex items-center gap-2 transition-colors border border-[#000000]/5 shadow-sm antialiased font-normal"
                >
                  <ArrowDownToLine className="w-4 h-4" /> บันทึกเป็นรูปภาพ
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-black/40 hover:text-black hover:bg-black/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="px-6">
              <div className="flex flex-wrap gap-2.5 items-center overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setSelectedChannels(['all'])}
                  className={cn(
                    'px-4 py-2 text-[14px] rounded-full border transition-all duration-200 antialiased cursor-pointer font-normal whitespace-nowrap',
                    selectedChannels.includes('all')
                      ? 'bg-[#000000] border-[#000000] text-white shadow-sm'
                      : 'border-neutral-200 bg-transparent text-neutral-800 hover:bg-neutral-50',
                  )}
                >
                  ทั้งหมด{' '}
                  <span className={selectedChannels.includes('all') ? 'text-white/60 text-[12px] ml-1 font-mono font-normal' : 'text-neutral-500 text-[12px] ml-1 font-mono font-normal'}>
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
                          : 'border-neutral-200 bg-transparent text-neutral-800 hover:bg-neutral-50',
                      )}
                    >
                      {source}{' '}
                      <span className={isActive ? 'text-white/60 text-[12px] ml-1 font-mono font-normal' : 'text-neutral-500 text-[12px] ml-1 font-mono font-normal'}>
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tab Content (Direct Sibling) */}
          <div className="p-6">
            {displayedPoItems.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-black/40 bg-white rounded-3xl border border-black/5 shadow-sm">
                <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-[15px]">ไม่มีรายการสั่งซื้อสำหรับช่องทางนี้</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-black/5 bg-slate-50/50">
                      <th className="py-4 font-normal text-black/40 text-[13px] w-12 text-center border-r border-black/5">#</th>
                      <th className="py-4 font-normal text-black/40 text-[13px] text-left pl-4 border-r border-black/5">ชื่อรายการ</th>
                      <th className="py-4 font-normal text-black/40 text-[13px] text-center w-24 border-r border-black/5">คงเหลือ</th>
                      <th className="py-4 font-normal text-black/40 text-[13px] text-center w-32 border-r border-black/5">จำนวนสั่งซื้อ</th>
                      <th className="py-4 font-normal text-black/40 text-[13px] w-24 text-center border-r border-black/5">หน่วย</th>
                      <th className="py-4 font-normal text-black/40 text-[13px] w-32 text-center">อัปเดตล่าสุด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPoItems.map((item, idx) => (
                      <tr key={item.id} className="border-b border-black/5 last:border-0 hover:bg-[#000000]/5 transition-colors">
                        <td className="py-4 text-[14px] text-black/30 text-center border-r border-black/5">{idx + 1}</td>
                        <td className="py-4 text-[15px] text-black font-medium text-left pl-4 border-r border-black/5">{item.name}</td>
                        <td
                          className={`py-4 text-[15px] text-center font-mono border-r border-black/5 ${getStockColorClass(Number(item.stock) || 0, Number(item.target_stock) || 0)}`}
                        >
                          {Number.isInteger(item.stock) ? item.stock : Number(item.stock).toFixed(1)}
                        </td>
                        <td className="py-4 text-[16px] text-black text-center font-mono font-medium border-r border-black/5">
                          {Number.isInteger(item.computedOrderQty) ? item.computedOrderQty : Number(item.computedOrderQty).toFixed(1)}
                        </td>
                        <td className="py-4 text-[14px] text-black/50 text-center border-r border-black/5">{item.unit || '-'}</td>
                        <td className="py-4 text-[13px] text-black/40 text-center font-mono">
                          {new Date(item.updated_at || Date.now()).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

