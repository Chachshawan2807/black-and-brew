'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, ArrowUpRight, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  computePurchaseOrderDerivedState,
  getStockColorClass,
  type InventoryStockFields,
} from '@/lib/inventory-stock';
import {
  useInventoryRealtime,
  type InventoryRealtimeItem,
} from '@/contexts/InventoryRealtimeContext';
import { NavPreloadLink } from '@/components/sidebar/NavPreloadLink';
import { PASTEL_SURFACE } from '@/lib/shift-colors';

type HomePurchaseOrdersSectionProps = {
  initialItems: InventoryRealtimeItem[];
  locale: string;
};

function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function PurchaseOrderRow({
  item,
  index,
  compact = false,
}: {
  item: InventoryStockFields & { computedOrderQty: number };
  index: number;
  compact?: boolean;
}) {
  const stock = Number(item.stock) || 0;
  const orderPoint = Number(item.order_point) || 0;

  if (compact) {
    return (
      <tr
        className="bb-grid-row-offscreen border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
      >
        <td className="py-3 px-3 text-center text-[13px] text-muted-foreground tabular-nums w-10">
          {index + 1}
        </td>
        <td className="py-3 px-3 text-[14px] text-foreground font-normal min-w-0">
          <span className="line-clamp-2">{item.name}</span>
        </td>
        <td className="py-3 px-3 text-center text-[15px] tabular-nums font-normal text-foreground w-24">
          {formatQty(item.computedOrderQty)}
        </td>
        <td
          className={cn(
            'py-3 px-3 text-center text-[14px] tabular-nums w-20',
            getStockColorClass(stock, orderPoint),
          )}
        >
          {formatQty(stock)}
        </td>
        <td className="py-3 px-3 text-center text-[13px] text-muted-foreground w-16">
          {item.unit || '-'}
        </td>
      </tr>
    );
  }

  return (
    <article
      className={cn(
        PASTEL_SURFACE,
        'bb-grid-row-offscreen rounded-2xl border border-black/8 bg-[#fff8ee] p-3.5 bb-shadow-sm flex flex-col gap-2.5',
      )}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-black/45 tabular-nums">#{index + 1}</p>
          <h3 className="text-[15px] font-normal text-black leading-snug line-clamp-2 mt-0.5">
            {item.name}
          </h3>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-black/45">สั่ง</p>
          <p className="text-[17px] tabular-nums font-normal text-black leading-none">
            {formatQty(item.computedOrderQty)}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 text-[12px]">
        <span className="text-black/50">
          คงเหลือ{' '}
          <span className={cn('tabular-nums font-normal', getStockColorClass(stock, orderPoint))}>
            {formatQty(stock)}
          </span>
        </span>
        <span className="text-black/45">{item.unit || '-'}</span>
      </div>
    </article>
  );
}

export default function HomePurchaseOrdersSection({
  initialItems,
  locale,
}: HomePurchaseOrdersSectionProps) {
  const { items, refresh, hasLoaded, subscribe } = useInventoryRealtime();
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['all']);

  const effectiveItems = hasLoaded ? items : initialItems;

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => subscribe(() => {}), [subscribe]);

  const { itemsToOrder, poSources, displayedPoItems } = useMemo(
    () => computePurchaseOrderDerivedState(effectiveItems, selectedChannels),
    [effectiveItems, selectedChannels],
  );

  const inventoryHref = `/${locale}/inventory`;

  return (
    <section
      aria-label="รายการที่ต้องสั่งซื้อจากคลังสินค้า"
      className="rounded-3xl border border-border bg-card p-5 md:p-7 bb-shadow-sm"
    >
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted bb-shadow-sm">
            <ShoppingCart className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-[clamp(1rem,2.5vw,1.25rem)] font-normal text-foreground tracking-tight leading-snug">
              รายการที่ต้องสั่งซื้อ
            </h2>
            <p className="mt-1 text-[0.8rem] font-normal text-muted-foreground/90 tracking-wide">
              คลังสินค้า · อัปเดตแบบเรียลไทม์
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] tabular-nums font-normal',
              itemsToOrder.length > 0
                ? 'border-red-200/80 bg-red-50/70 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300'
                : 'border-border bg-muted/50 text-muted-foreground',
            )}
          >
            <Package className="h-3.5 w-3.5 opacity-70" aria-hidden />
            {itemsToOrder.length} รายการ
          </span>
          <NavPreloadLink
            href={inventoryHref}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-[12px] text-foreground transition-colors hover:bg-muted/60"
          >
            คลังสินค้า
            <ArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
          </NavPreloadLink>
        </div>
      </header>

      {itemsToOrder.length > 0 && poSources.length > 0 && (
        <div className="mb-4 -mx-1 px-1 overflow-x-auto bb-smooth-scroll scrollbar-hide">
          <div className="flex flex-nowrap gap-2 min-w-min pb-1">
            <button
              type="button"
              onClick={() => setSelectedChannels(['all'])}
              className={cn(
                'px-3.5 py-1.5 text-[13px] rounded-full border transition-all duration-200 font-normal whitespace-nowrap shrink-0',
                selectedChannels.includes('all')
                  ? 'bg-foreground border-foreground text-background bb-shadow-sm'
                  : 'border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              ทั้งหมด
              <span className="ml-1 text-[11px] tabular-nums opacity-70">({itemsToOrder.length})</span>
            </button>
            {poSources.map((source) => {
              const count = itemsToOrder.filter(
                (i) => (i.source || 'ไม่ได้ระบุแหล่งที่มา') === source,
              ).length;
              const isActive = selectedChannels.includes(source) && !selectedChannels.includes('all');
              return (
                <button
                  key={source}
                  type="button"
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
                    'px-3.5 py-1.5 text-[13px] rounded-full border transition-all duration-200 font-normal whitespace-nowrap shrink-0 max-w-[12rem] truncate',
                    isActive
                      ? 'bg-foreground border-foreground text-background bb-shadow-sm'
                      : 'border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  )}
                  title={source}
                >
                  {source}
                  <span className="ml-1 text-[11px] tabular-nums opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {itemsToOrder.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-12 px-4 text-center">
          <ShoppingCart className="h-10 w-10 text-muted-foreground/25 mb-3" aria-hidden />
          <p className="text-[15px] text-muted-foreground font-normal">ไม่มีรายการที่ต้องสั่งซื้อ</p>
          <p className="mt-1 text-[13px] text-muted-foreground/70">สต็อกทุกรายการอยู่ในระดับที่กำหนด</p>
        </div>
      ) : displayedPoItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-10 px-4 text-center">
          <p className="text-[14px] text-muted-foreground">ไม่มีรายการในแหล่งที่เลือก</p>
        </div>
      ) : (
        <>
          {/* Mobile: card stack */}
          <div className="md:hidden max-h-[min(60svh,28rem)] overflow-y-auto bb-smooth-scroll -mx-1 px-1">
            <div className="space-y-2.5">
              {displayedPoItems.map((item, idx) => (
                <PurchaseOrderRow key={item.id} item={item} index={idx} />
              ))}
            </div>
          </div>

          {/* Desktop: compact table */}
          <div className="hidden md:block rounded-2xl border border-border overflow-hidden bb-shadow-sm">
            <div className="max-h-[min(55vh,24rem)] overflow-y-auto bb-smooth-scroll">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/60">
                    <th className="py-3 px-3 text-[12px] font-normal text-muted-foreground text-center w-10">
                      #
                    </th>
                    <th className="py-3 px-3 text-[12px] font-normal text-muted-foreground">
                      ชื่อรายการ
                    </th>
                    <th className="py-3 px-3 text-[12px] font-normal text-muted-foreground text-center w-24">
                      จำนวนสั่ง
                    </th>
                    <th className="py-3 px-3 text-[12px] font-normal text-muted-foreground text-center w-20">
                      คงเหลือ
                    </th>
                    <th className="py-3 px-3 text-[12px] font-normal text-muted-foreground text-center w-16">
                      หน่วย
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedPoItems.map((item, idx) => (
                    <PurchaseOrderRow key={item.id} item={item} index={idx} compact />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
