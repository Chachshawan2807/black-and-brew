'use client';

import { LoadingIcon } from '@/components/ui/loading-icon';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { History, PackageMinus, PackagePlus, Plus, Search, SlidersHorizontal, Trash2, X, ICON_STROKE } from '@/lib/icons';
import {
  INVENTORY_MODAL_OVERLAY,
  INVENTORY_MODAL_PANEL,
  INVENTORY_MODAL_PANEL_SHEET,
  InventoryEmptyState,
  InventoryModalHeader,
  useInventoryMotion,
} from './inventory-ui-primitives';

import { cn } from '@/lib/utils';
import { INVENTORY_QUICK_ACTION_COLORS } from '@/lib/shift-colors';

import {
  getModalBackdropKeyboardAwareStyle,
  getModalContentKeyboardAwareStyle,
} from '@/lib/keyboard-aware-panel-style';

import { HintTooltip } from '@/components/ui/hint-tooltip';
import { RoundedSelect } from '@/components/ui/rounded-select';
import { INVENTORY_MODAL_Z_CLASS } from '@/lib/floating-action-layout';
import { useVisualViewportInsets } from '@/hooks/use-visual-viewport-insets';
import type {
  InventoryHistoryDisplayRow,
  InventoryTransactionFilterType,
} from '@/lib/inventory-history-query';
import { resolveInventoryHistoryTimestamp } from '@/lib/inventory-transaction-date';
import { THAI_TIMEZONE } from '@/lib/timezone';
import { InventoryModalPortal } from './InventoryModalPortal';



export type TransactionHistoryRow = InventoryHistoryDisplayRow;



type InventoryHistoryModalProps = {

  transactionHistory: TransactionHistoryRow[];

  onClose: () => void;

  historyTypeFilter: InventoryTransactionFilterType;

  onTypeFilterChange: (type: InventoryTransactionFilterType) => void;

  onLoadMore: () => void;

  hasMoreHistory: boolean;

  isHistoryLoading: boolean;

  isHistoryRefreshing: boolean;

  historySearchQuery: string;

  onSearchQueryChange: (query: string) => void;

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

const HISTORY_TYPE_FILTERS: { value: InventoryTransactionFilterType; label: string }[] = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: 'IN', label: 'รับเข้า' },
  { value: 'OUT', label: 'นำออก' },
  { value: 'ADJUST', label: 'ปรับจำนวน' },
];

const HISTORY_BADGE_LAYOUT =
  'w-9 h-9 rounded-2xl inline-flex items-center justify-center bb-transition bb-shadow-sm border';

function TransactionTypeBadge({ type }: { type: TransactionHistoryRow['type'] }) {

  if (type === 'ADJUST') {

    return (

      <HintTooltip tip="ปรับจำนวน">
        <span

          className={cn(HISTORY_BADGE_LAYOUT, INVENTORY_QUICK_ACTION_COLORS.adjust)}

          aria-label="ปรับจำนวน"

        >

          <SlidersHorizontal className="w-4 h-4" strokeWidth={ICON_STROKE} />

        </span>
      </HintTooltip>

    );

  }

  if (type === 'ADD') {
    return (
      <HintTooltip tip="เพิ่มรายการ">
        <span
          className={cn(HISTORY_BADGE_LAYOUT, INVENTORY_QUICK_ACTION_COLORS.adjust)}
          aria-label="เพิ่มรายการ"
        >
          <Plus className="w-4 h-4" strokeWidth={ICON_STROKE} />
        </span>
      </HintTooltip>
    );
  }

  if (type === 'DELETE') {
    return (
      <HintTooltip tip="ลบรายการ">
        <span
          className={cn(HISTORY_BADGE_LAYOUT, INVENTORY_QUICK_ACTION_COLORS.out)}
          aria-label="ลบรายการ"
        >
          <Trash2 className="w-4 h-4" strokeWidth={ICON_STROKE} />
        </span>
      </HintTooltip>
    );
  }

  const isIn = type === 'IN';



  return (

    <HintTooltip tip={isIn ? 'รับเข้า' : 'นำออก'}>
      <span

        className={cn(
          HISTORY_BADGE_LAYOUT,
          isIn ? INVENTORY_QUICK_ACTION_COLORS.in : INVENTORY_QUICK_ACTION_COLORS.out,
        )}

        aria-label={isIn ? 'รับเข้า' : 'นำออก'}

      >

        {isIn ? <PackagePlus className="w-4 h-4" strokeWidth={ICON_STROKE} /> : <PackageMinus className="w-4 h-4" strokeWidth={ICON_STROKE} />}

      </span>
    </HintTooltip>

  );

}



export function InventoryHistoryModal({
  transactionHistory,
  onClose,
  historyTypeFilter,
  onTypeFilterChange,
  onLoadMore,
  hasMoreHistory,
  isHistoryLoading,
  isHistoryRefreshing,
  historySearchQuery,
  onSearchQueryChange,
}: InventoryHistoryModalProps) {

  const [isMounted, setIsMounted] = useState(false);
  const isSearchActive = historySearchQuery.trim().length > 0;
  const isInitialLoading = isHistoryLoading && transactionHistory.length === 0;

  const viewportInsets = useVisualViewportInsets(isMounted);

  const modalBackdropStyle = getModalBackdropKeyboardAwareStyle({ insets: viewportInsets });

  const modalContentStyle = getModalContentKeyboardAwareStyle({ insets: viewportInsets });

  const { overlay, sheet } = useInventoryMotion();



  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-only mount gate
    setIsMounted(true);

  }, []);



  return (
    <InventoryModalPortal>
    <motion.div

      initial={overlay.initial}

      animate={overlay.animate}

      exit={overlay.exit}

      transition={overlay.transition}

      className={cn(
        'fixed inset-0 flex items-end md:items-center justify-center p-0 md:p-4 transition-[padding,height] duration-200',
        INVENTORY_MODAL_OVERLAY,
        INVENTORY_MODAL_Z_CLASS,
      )}

      style={modalBackdropStyle}

      onClick={onClose}

    >

      <motion.div

        initial={sheet.initial}

        animate={sheet.animate}

        exit={sheet.exit}

        transition={sheet.transition}

        className={cn(INVENTORY_MODAL_PANEL, INVENTORY_MODAL_PANEL_SHEET, 'md:w-fit md:max-w-[calc(100vw-2rem)] transition-[max-height] duration-200')}

        style={modalContentStyle}

        onClick={(e) => e.stopPropagation()}

        role="dialog"

        aria-modal="true"

        aria-labelledby="inventory-history-title"

      >

        <InventoryModalHeader
          icon={<History className="w-5 h-5" strokeWidth={ICON_STROKE} />}
          title="ประวัติ"
          subtitle="ตรวจสอบรายการรับเข้า นำออก ปรับจำนวน เพิ่ม และลบรายการย้อนหลัง"
          onClose={onClose}
          closeLabel="ปิดประวัติ"
        />

        <div className="px-4 md:px-6 pb-4 border-b border-border bg-card shrink-0 space-y-4">
            <div className="space-y-1.5 min-w-0">
              <label
                htmlFor="history-type-filter"
                className="text-[13px] font-normal text-foreground uppercase tracking-widest px-1"
              >
                ประเภท
              </label>
              <RoundedSelect
                id="history-type-filter"
                value={historyTypeFilter}
                onChange={(e) =>
                  onTypeFilterChange(e.target.value as InventoryTransactionFilterType)
                }
                wrapperClassName="w-full"
                aria-label="กรองประเภทประวัติคลังสินค้า"
              >
                {HISTORY_TYPE_FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </RoundedSelect>
            </div>

            <div className="min-w-0">
              <label htmlFor="history-item-search" className="sr-only">
                ค้นหาชื่อรายการสินค้าในประวัติ
              </label>
              <div className="relative min-w-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                <input
                  id="history-item-search"
                  type="text"
                  enterKeyHint="search"
                  placeholder="ค้นหาชื่อรายการสินค้า..."
                  value={historySearchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      onSearchQueryChange('');
                    }
                  }}
                  title={historySearchQuery || undefined}
                  className="h-11 w-full min-w-0 pl-9 pr-9 rounded-xl bg-background border border-border text-sm font-normal text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/10 bb-transition antialiased"
                />
                {isSearchActive ? (
                  <button
                    type="button"
                    onClick={() => onSearchQueryChange('')}
                    aria-label="ล้างการค้นหา"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4" strokeWidth={ICON_STROKE} />
                  </button>
                ) : null}
              </div>
            </div>

        </div>



        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-auto bb-smooth-scroll bb-scroll-xy px-4 py-4 md:px-6 md:py-4 bg-background scrollbar-thin relative">

          {isInitialLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-foreground/40">
              <LoadingIcon size="xl" />
              <span className="text-[14px] font-normal">กำลังโหลดประวัติ...</span>
            </div>
          ) : (
          <div
            className={cn(
              'inline-block w-max min-w-full bg-background rounded-[2rem] border border-border bb-shadow-sm overflow-hidden transition-opacity duration-150',
              isHistoryRefreshing && 'opacity-60',
            )}
          >

            <table className="w-max text-left border-collapse table-auto">

              <thead className="sticky top-0 z-10 bg-card">

                <tr className="bg-card border-b border-border">

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

                    <td colSpan={5} className="py-12">
                      <InventoryEmptyState
                        icon={<History className="w-8 h-8" strokeWidth={ICON_STROKE} />}
                        message={
                          isSearchActive
                            ? `ไม่พบประวัติที่ตรงกับ "${historySearchQuery.trim()}"`
                            : 'ยังไม่มีประวัติการเคลื่อนไหวในขณะนี้'
                        }
                        className="border-0 bg-transparent shadow-none"
                      />
                    </td>

                  </tr>

                ) : (

                  transactionHistory.map((tx) => {

                    const txType: TransactionHistoryRow['type'] =
                      tx.type === 'IN' ||
                      tx.type === 'OUT' ||
                      tx.type === 'ADJUST' ||
                      tx.type === 'ADD' ||
                      tx.type === 'DELETE'
                        ? tx.type
                        : 'ADJUST';



                    return (

                      <tr

                        key={tx.id}

                        className="group hover:bg-muted/40 transition-colors"

                      >

                        <td className="py-3.5 px-4 text-[14px] text-foreground/60 tabular-nums text-left whitespace-nowrap">

                          {resolveInventoryHistoryTimestamp(tx).toLocaleString('th-TH', {

                            dateStyle: 'short',

                            timeStyle: 'short',

                            timeZone: THAI_TIMEZONE,

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

                      </tr>

                    );

                  })

                )}

              </tbody>

            </table>

          </div>
          )}

        </div>



        <div className="px-4 md:px-6 py-3 md:py-4 bg-card/80 border-t border-border flex flex-col md:flex-row gap-3 md:items-center md:justify-between shrink-0 text-[12px] text-muted-foreground">

          <span className="inline-flex items-center gap-2">
            แสดง {transactionHistory.length} รายการ
            {isHistoryRefreshing ? <LoadingIcon size="sm" className="aria-hidden" /> : null}
          </span>

          {hasMoreHistory ? (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isHistoryLoading}
              className="min-h-11 rounded-full border border-border bg-background px-4 py-2 text-[13px] font-normal text-foreground bb-transition hover:border-foreground/30 hover:bg-muted disabled:opacity-50"
            >
              {isHistoryLoading ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingIcon size="md" />
                  กำลังโหลดประวัติ...
                </span>
              ) : (
                'ดูเพิ่มเติม'
              )}
            </button>
          ) : null}

        </div>

      </motion.div>

    </motion.div>
    </InventoryModalPortal>

  );

}


