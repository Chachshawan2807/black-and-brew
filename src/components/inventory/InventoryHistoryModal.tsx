'use client';



import { useEffect, useState } from 'react';

import { motion } from 'framer-motion';

import { fadeOverlay, modalContent } from '@/lib/motion-presets';

import { History, PackageMinus, PackagePlus, Plus, ShoppingCart, SlidersHorizontal, Trash2, X } from 'lucide-react';

import { cn } from '@/lib/utils';

import {
  getModalBackdropKeyboardAwareStyle,
  getModalContentKeyboardAwareStyle,
} from '@/lib/keyboard-aware-panel-style';

import { HintTooltip } from '@/components/ui/hint-tooltip';

import { useVisualViewportInsets } from '@/hooks/use-visual-viewport-insets';



export type TransactionHistoryRow = {

  id: string;

  created_at: string;

  type: 'IN' | 'OUT' | 'ADJUST' | 'ADD' | 'DELETE';

  quantity: number;

  balance_after: number;

  inventory_items?: { name?: string } | null;

};



type InventoryHistoryModalProps = {

  transactionHistory: TransactionHistoryRow[];

  onClose: () => void;

};



function transactionTypeLabel(type: TransactionHistoryRow['type']) {
  switch (type) {
    case 'IN':
      return 'รับเข้า';
    case 'OUT':
      return 'นำออก';
    case 'ADJUST':
      return 'ปรับจำนวน';
    case 'ADD':
      return 'เพิ่มรายการ';
    case 'DELETE':
      return 'ลบรายการ';
    default:
      return 'ปรับจำนวน';
  }
}

function TransactionTypeBadge({ type }: { type: TransactionHistoryRow['type'] }) {

  if (type === 'ADJUST') {

    return (

      <HintTooltip tip="ปรับจำนวน">
        <span

          className="w-9 h-9 rounded-2xl inline-flex items-center justify-center transition-all shadow-sm border bb-pastel-surface bg-[#fff3cd] text-[#000000] border-[#ffeeba]"

          aria-label="ปรับจำนวน"

        >

          <SlidersHorizontal className="w-4.5 h-4.5" />

        </span>
      </HintTooltip>

    );

  }

  if (type === 'ADD') {
    return (
      <HintTooltip tip="เพิ่มรายการ">
        <span
          className="w-9 h-9 rounded-2xl inline-flex items-center justify-center transition-all shadow-sm border bb-pastel-surface bg-[#fff3cd] text-[#000000] border-[#ffeeba]"
          aria-label="เพิ่มรายการ"
        >
          <Plus className="w-4.5 h-4.5" />
        </span>
      </HintTooltip>
    );
  }

  if (type === 'DELETE') {
    return (
      <HintTooltip tip="ลบรายการ">
        <span
          className="w-9 h-9 rounded-2xl inline-flex items-center justify-center transition-all shadow-sm border bb-pastel-surface bg-[#f8d7da] text-[#000000] border-[#f5c6cb]"
          aria-label="ลบรายการ"
        >
          <Trash2 className="w-4.5 h-4.5" />
        </span>
      </HintTooltip>
    );
  }

  const isIn = type === 'IN';



  return (

    <HintTooltip tip={isIn ? 'รับเข้า' : 'นำออก'}>
      <span

        className={cn(

          'w-9 h-9 rounded-2xl inline-flex items-center justify-center transition-all shadow-sm border',

          isIn ? 'bb-pastel-surface bg-[#d4edda] text-[#000000] border-[#c3e6cb]' : 'bb-pastel-surface bg-[#f8d7da] text-[#000000] border-[#f5c6cb]',

        )}

        aria-label={isIn ? 'รับเข้า' : 'นำออก'}

      >

        {isIn ? <PackagePlus className="w-4.5 h-4.5" /> : <PackageMinus className="w-4.5 h-4.5" />}

      </span>
    </HintTooltip>

  );

}



export function InventoryHistoryModal({ transactionHistory, onClose }: InventoryHistoryModalProps) {

  const [isMounted, setIsMounted] = useState(false);

  const viewportInsets = useVisualViewportInsets(isMounted);

  const modalBackdropStyle = getModalBackdropKeyboardAwareStyle({ insets: viewportInsets });

  const modalContentStyle = getModalContentKeyboardAwareStyle({ insets: viewportInsets });



  useEffect(() => {

    setIsMounted(true);

  }, []);



  return (

    <motion.div

      initial={fadeOverlay.initial}

      animate={fadeOverlay.animate}

      exit={fadeOverlay.exit}

      transition={fadeOverlay.transition}

      className="fixed inset-0 z-[210] flex items-end md:items-center justify-center bg-black/20 backdrop-blur-md p-0 md:p-4 transition-[padding,height] duration-200"

      style={modalBackdropStyle}

      onClick={onClose}

    >

      <motion.div

        initial={modalContent.initial}

        animate={modalContent.animate}

        exit={modalContent.exit}

        transition={modalContent.transition}

        className="relative bg-card rounded-t-3xl md:rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.1)] w-full md:w-fit md:max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-hidden flex flex-col border border-border min-h-0 pb-[env(safe-area-inset-bottom)] transition-[max-height] duration-200"

        style={modalContentStyle}

        onClick={(e) => e.stopPropagation()}

      >

        <HintTooltip tip="ปิดประวัติ">
          <button

            type="button"

            onClick={onClose}

            className="absolute top-4 right-4 p-2 text-foreground/40 hover:text-foreground hover:bg-black/5 rounded-full transition-all active:scale-95 z-10"

            aria-label="ปิดประวัติ"

          >

            <X className="w-6 h-6" />

          </button>
        </HintTooltip>



        <div className="px-4 md:px-6 py-4 md:py-5 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm shrink-0 pr-14">

          <div>

            <h2 className="text-xl md:text-2xl font-normal text-foreground flex items-center gap-3">

              <History className="w-6 h-6 text-foreground/40" />

              ประวัติ

            </h2>

            <p className="text-foreground/40 text-[13px] mt-1 font-normal max-w-[32rem]">

              ตรวจสอบรายการรับเข้า นำออก ปรับจำนวน เพิ่ม และลบรายการย้อนหลัง

            </p>

          </div>

        </div>



        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-auto bb-smooth-scroll bb-scroll-xy px-4 py-4 md:px-6 md:py-4 bg-background scrollbar-thin">

          <div className="inline-block w-max min-w-full bg-background rounded-[2rem] border border-border shadow-sm">

            <table className="w-max text-left border-collapse table-auto">

              <thead>

                <tr className="bg-muted/50 border-b border-border">

                  <th className="py-5 px-4 font-normal text-foreground/40 text-[13px] uppercase tracking-wider text-left whitespace-nowrap">

                    วันที่และเวลา

                  </th>

                  <th className="py-5 px-4 font-normal text-foreground/40 text-[13px] uppercase tracking-wider text-left">

                    ชื่อรายการสินค้า

                  </th>

                  <th className="py-5 px-4 font-normal text-foreground/40 text-[13px] uppercase tracking-wider text-center whitespace-nowrap w-[1%]">

                    ประเภท

                  </th>

                  <th className="py-5 px-4 font-normal text-foreground/40 text-[13px] uppercase tracking-wider text-center whitespace-nowrap w-[1%]">

                    จำนวน

                  </th>

                  <th className="py-5 px-4 font-normal text-foreground/40 text-[13px] uppercase tracking-wider text-center whitespace-nowrap w-[1%]">

                    คงเหลือ

                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-border">

                {transactionHistory.length === 0 ? (

                  <tr>

                    <td colSpan={5} className="py-20 text-center text-foreground/30 text-[15px] font-normal italic">

                      <div className="flex flex-col items-center gap-3">

                        <ShoppingCart className="w-10 h-10 opacity-10" />

                        ยังไม่มีประวัติการเคลื่อนไหวในขณะนี้

                      </div>

                    </td>

                  </tr>

                ) : (

                  transactionHistory.map((tx, index) => {

                    const txType: TransactionHistoryRow['type'] =
                      tx.type === 'IN' ||
                      tx.type === 'OUT' ||
                      tx.type === 'ADJUST' ||
                      tx.type === 'ADD' ||
                      tx.type === 'DELETE'
                        ? tx.type
                        : 'ADJUST';



                    return (

                      <motion.tr

                        key={tx.id}

                        initial={{ opacity: 0, y: 10 }}

                        animate={{ opacity: 1, y: 0 }}

                        transition={{ delay: index * 0.03 }}

                        className="group hover:bg-muted/40 transition-colors"

                      >

                        <td className="py-3.5 px-4 text-[14px] text-foreground/60 tabular-nums text-left whitespace-nowrap">

                          {new Date(tx.created_at).toLocaleString('th-TH', {

                            dateStyle: 'short',

                            timeStyle: 'short',

                          })}

                        </td>

                        <td

                          className="py-3.5 px-4 text-[15px] text-foreground font-normal text-left align-middle whitespace-nowrap"

                          style={{ lineHeight: '1.6' }}

                        >

                          {tx.inventory_items?.name || 'ไม่ทราบชื่อสินค้า'}

                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap w-[1%]">

                          <div className="flex flex-col items-center gap-1">

                            <TransactionTypeBadge type={txType} />

                            <span className="text-[11px] text-foreground/45 font-normal">

                              {transactionTypeLabel(txType)}

                            </span>

                          </div>

                        </td>

                        <td className="py-3.5 px-4 text-[15px] text-center tabular-nums text-foreground font-normal whitespace-nowrap w-[1%]">

                          {tx.quantity}

                        </td>

                        <td className="py-3.5 px-4 text-[15px] text-center tabular-nums text-foreground/40 whitespace-nowrap w-[1%]">

                          {tx.balance_after}

                        </td>

                      </motion.tr>

                    );

                  })

                )}

              </tbody>

            </table>

          </div>

        </div>



        <div className="px-4 md:px-6 py-3 md:py-4 bg-card/80 border-t border-border flex justify-between items-center shrink-0 text-[12px] text-muted-foreground">

          <span>แสดง {transactionHistory.length} รายการล่าสุด</span>

        </div>

      </motion.div>

    </motion.div>

  );

}


