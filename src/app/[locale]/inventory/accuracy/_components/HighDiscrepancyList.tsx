'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import {
  sortHighDiscrepancyItems,
  type HighDiscrepancyItem,
  type HighDiscrepancySortBy,
  type HighDiscrepancySortOrder,
} from '@/lib/inventory-accuracy-report';

type HighDiscrepancyListProps = {
  items: HighDiscrepancyItem[];
};

function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function SortButton({
  label,
  active,
  sortOrder,
  onClick,
  activeClassName,
}: {
  label: string;
  active: boolean;
  sortOrder: HighDiscrepancySortOrder;
  onClick: () => void;
  activeClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 transition-all ${
        active
          ? `bb-pastel-surface ${activeClassName}`
          : 'border-border bg-muted text-foreground hover:bg-muted/80'
      }`}
    >
      <span className="text-[11px]">{label}</span>
      {active ? (
        sortOrder === 'desc' ? (
          <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUp className="h-3.5 w-3.5" />
        )
      ) : null}
    </button>
  );
}

export function HighDiscrepancyList({ items }: HighDiscrepancyListProps) {
  const [sortBy, setSortBy] = useState<HighDiscrepancySortBy>('discrepancy');
  const [sortOrder, setSortOrder] = useState<HighDiscrepancySortOrder>('desc');

  const sortedItems = useMemo(
    () => sortHighDiscrepancyItems(items, { sortBy, sortOrder }),
    [items, sortBy, sortOrder],
  );

  const handleSortBy = (nextSortBy: HighDiscrepancySortBy) => {
    if (sortBy === nextSortBy) {
      setSortOrder((current) => (current === 'desc' ? 'asc' : 'desc'));
      return;
    }
    setSortBy(nextSortBy);
    setSortOrder('desc');
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-muted p-5 text-center text-sm text-muted-foreground">
        ยังไม่มีรายการต้องเบิกที่คลาดเคลื่อน
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">เรียงตาม</span>
        <SortButton
          label="หน่วย"
          active={sortBy === 'discrepancy'}
          sortOrder={sortOrder}
          onClick={() => handleSortBy('discrepancy')}
          activeClassName="border-[#ffeeba] bg-[#fff3cd] text-black"
        />
        <SortButton
          label="ความแม่นยำ"
          active={sortBy === 'accuracy'}
          sortOrder={sortOrder}
          onClick={() => handleSortBy('accuracy')}
          activeClassName="border-[#c3e6cb] bg-[#d4edda] text-black"
        />
      </div>

      <div
        className="hidden px-4 text-[11px] uppercase tracking-[0.14em] text-muted-foreground md:grid md:grid-cols-[minmax(0,1fr)_6.5rem_5.5rem] md:gap-4"
        aria-hidden="true"
      >
        <span>รายการสินค้า</span>
        <span className="text-center">คลาดเคลื่อน</span>
        <span className="text-right">ความแม่นยำ</span>
      </div>

      <div className="space-y-2">
        {sortedItems.map((item) => (
          <div
            key={item.itemId}
            className="rounded-2xl border border-border bg-background p-4"
          >
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_6.5rem_5.5rem] md:items-center md:gap-4">
              <div className="min-w-0">
                <p className="font-normal text-foreground">{item.itemName || 'ไม่ทราบชื่อสินค้า'}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ล่าสุด: ระบบ {formatQty(item.lastSystemStockQty ?? 0)} / นับได้{' '}
                  {formatQty(item.lastCountedQty ?? 0)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border pt-3 md:justify-center md:border-0 md:pt-0">
                <span className="shrink-0 text-xs text-muted-foreground md:hidden">คลาดเคลื่อน</span>
                <span className="inline-flex min-w-[5.5rem] justify-center rounded-2xl bg-[#fff3cd] px-3 py-1.5 text-sm tabular-nums text-black bb-pastel-surface">
                  {formatQty(item.totalDiscrepancyQty)} หน่วย
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border pt-3 md:justify-end md:border-0 md:pt-0">
                <span className="shrink-0 text-xs text-muted-foreground md:hidden">ความแม่นยำ</span>
                <span className="min-w-[3.5rem] text-right text-sm tabular-nums text-foreground">
                  {item.accuracyPct ?? 0}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
