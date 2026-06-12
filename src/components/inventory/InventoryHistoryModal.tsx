'use client';



import { motion } from 'framer-motion';

import { History, PackageMinus, PackagePlus, ShoppingCart, SlidersHorizontal, X } from 'lucide-react';

import { cn } from '@/lib/utils';



export type TransactionHistoryRow = {

  id: string;

  created_at: string;

  type: 'IN' | 'OUT' | 'ADJUST';

  quantity: number;

  balance_after: number;

  inventory_items?: { name?: string } | null;

};



type InventoryHistoryModalProps = {

  transactionHistory: TransactionHistoryRow[];

  onClose: () => void;

};



function TransactionTypeBadge({ type }: { type: TransactionHistoryRow['type'] }) {

  if (type === 'ADJUST') {

    return (

      <span

        className="w-9 h-9 rounded-2xl inline-flex items-center justify-center transition-all shadow-sm border bb-pastel-surface bg-[#fff3cd] text-[#000000] border-[#ffeeba]"

        title="ปรับจำนวน"

        aria-label="ปรับจำนวน"

      >

        <SlidersHorizontal className="w-4.5 h-4.5" />

      </span>

    );

  }



  const isIn = type === 'IN';



  return (

    <span

      className={cn(

        'w-9 h-9 rounded-2xl inline-flex items-center justify-center transition-all shadow-sm border',

        isIn ? 'bb-pastel-surface bg-[#d4edda] text-[#000000] border-[#c3e6cb]' : 'bb-pastel-surface bg-[#f8d7da] text-[#000000] border-[#f5c6cb]',

      )}

      title={isIn ? 'รับเข้า' : 'นำออก'}

      aria-label={isIn ? 'รับเข้า' : 'นำออก'}

    >

      {isIn ? <PackagePlus className="w-4.5 h-4.5" /> : <PackageMinus className="w-4.5 h-4.5" />}

    </span>

  );

}



export function InventoryHistoryModal({ transactionHistory, onClose }: InventoryHistoryModalProps) {

  return (

    <motion.div

      initial={{ opacity: 0 }}

      animate={{ opacity: 1 }}

      exit={{ opacity: 0 }}

      className="fixed inset-0 z-[210] flex items-end md:items-center justify-center bg-black/20 backdrop-blur-md p-0 md:p-4"

      onClick={onClose}

    >

      <motion.div

        initial={{ scale: 0.95, y: 20 }}

        animate={{ scale: 1, y: 0 }}

        exit={{ scale: 0.95, y: 20 }}

        transition={{ type: 'spring', stiffness: 300, damping: 30 }}

        className="relative bg-card rounded-t-3xl md:rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.1)] w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col border border-border min-h-0 pb-[env(safe-area-inset-bottom)]"

        onClick={(e) => e.stopPropagation()}

      >

        <button

          type="button"

          onClick={onClose}

          className="absolute top-4 right-4 p-2 text-foreground/40 hover:text-foreground hover:bg-black/5 rounded-full transition-all active:scale-95 z-10"

          aria-label="ปิดประวัติ"

        >

          <X className="w-6 h-6" />

        </button>



        <div className="px-4 md:px-8 py-4 md:py-6 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm shrink-0 pr-14 md:pr-16">

          <div>

            <h2 className="text-xl md:text-2xl font-normal text-foreground flex items-center gap-3">

              <History className="w-6 h-6 text-foreground/40" />

              ประวัติ

            </h2>

            <p className="text-foreground/40 text-[13px] mt-1 font-normal">

              ตรวจสอบรายการรับเข้า นำออก และปรับจำนวนย้อนหลัง

            </p>

          </div>

        </div>



        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 md:p-8 bg-card scrollbar-thin">

          <div className="bg-background rounded-[2rem] border border-border shadow-sm overflow-x-auto">

            <table className="w-full min-w-[640px] text-left border-collapse">

              <thead>

                <tr className="bg-muted/50 border-b border-border">

                  <th className="py-5 px-6 font-normal text-foreground/40 text-[13px] uppercase tracking-wider text-center w-[160px]">

                    วันที่และเวลา

                  </th>

                  <th className="py-5 px-6 font-normal text-foreground/40 text-[13px] uppercase tracking-wider text-center">

                    ชื่อรายการสินค้า

                  </th>

                  <th className="py-5 px-6 font-normal text-foreground/40 text-[13px] uppercase tracking-wider text-center w-[120px]">

                    ประเภท

                  </th>

                  <th className="py-5 px-6 font-normal text-foreground/40 text-[13px] uppercase tracking-wider text-center w-[110px]">

                    จำนวน

                  </th>

                  <th className="py-5 px-6 font-normal text-foreground/40 text-[13px] uppercase tracking-wider text-center w-[110px]">

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

                      tx.type === 'IN' || tx.type === 'OUT' || tx.type === 'ADJUST' ? tx.type : 'ADJUST';



                    return (

                      <motion.tr

                        key={tx.id}

                        initial={{ opacity: 0, y: 10 }}

                        animate={{ opacity: 1, y: 0 }}

                        transition={{ delay: index * 0.03 }}

                        className="group hover:bg-muted/40 transition-colors"

                      >

                        <td className="py-3.5 px-6 text-[14px] text-foreground/60 font-mono text-left">

                          {new Date(tx.created_at).toLocaleString('th-TH', {

                            dateStyle: 'short',

                            timeStyle: 'short',

                          })}

                        </td>

                        <td

                          className="py-3.5 px-6 text-[15px] text-foreground font-normal text-left"

                          style={{ lineHeight: '1.6' }}

                        >

                          {tx.inventory_items?.name || 'ไม่ทราบชื่อสินค้า'}

                        </td>

                        <td className="py-3.5 px-6 text-center">

                          <div className="flex flex-col items-center gap-1">

                            <TransactionTypeBadge type={txType} />

                            <span className="text-[11px] text-foreground/45 font-normal">

                              {txType === 'IN' ? 'รับเข้า' : txType === 'OUT' ? 'นำออก' : 'ปรับจำนวน'}

                            </span>

                          </div>

                        </td>

                        <td className="py-3.5 px-6 text-[15px] text-center font-mono text-foreground font-normal">

                          {tx.quantity}

                        </td>

                        <td className="py-3.5 px-6 text-[15px] text-center font-mono text-foreground/40">

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



        <div className="px-4 md:px-8 py-3 md:py-4 bg-card/80 border-t border-border flex justify-between items-center shrink-0 text-[12px] text-muted-foreground">

          <span>แสดง {transactionHistory.length} รายการล่าสุด</span>

        </div>

      </motion.div>

    </motion.div>

  );

}


