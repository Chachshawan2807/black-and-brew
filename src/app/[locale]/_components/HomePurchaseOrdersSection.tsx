'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, ArrowUpRight, Package } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { FilterChipBar } from '@/components/ui/segment-tab-bar';
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
import {
  HomeSectionBadge,
  HomeSectionHeader,
  homeSectionLinkClassName,
} from './home-section-header';
import type { HomeSectionLayout } from './home-layout';

type HomePurchaseOrdersSectionProps = {
  initialItems: InventoryRealtimeItem[];
  locale: string;
  layout?: HomeSectionLayout;
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
      <tr className="bb-grid-row-offscreen border-b border-border/80 last:border-0 hover:bg-muted/35 transition-colors">
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
          <p className="text-[11px] text-black/45 tabular-nums tracking-wide uppercase">
            #{index + 1}
          </p>
          <h3 className="text-[15px] font-normal text-black leading-snug line-clamp-2 mt-0.5">
            {item.name}
          </h3>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-black/45 tracking-wide">สั่ง</p>
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
  layout = 'default',
}: HomePurchaseOrdersSectionProps) {
  const isDashboard = layout === 'dashboard';
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

  const sourceChips = useMemo(() => {
    const chips = [
      { id: 'all', label: 'ทั้งหมด', count: itemsToOrder.length },
      ...poSources.map((source) => ({
        id: source,
        label: source,
        count: itemsToOrder.filter(
          (i) => (i.source || 'ไม่ได้ระบุแหล่งที่มา') === source,
        ).length,
      })),
    ];
    return chips;
  }, [itemsToOrder, poSources]);

  const handleSourceToggle = (id: string) => {
    if (id === 'all') {
      setSelectedChannels(['all']);
      return;
    }
    setSelectedChannels((prev) => {
      let next = prev.filter((c) => c !== 'all');
      if (next.includes(id)) {
        next = next.filter((c) => c !== id);
      } else {
        next = [...next, id];
      }
      return next.length === 0 ? ['all'] : next;
    });
  };

  return (
    <section
      aria-label="รายการที่ต้องสั่งซื้อจากคลังสินค้า"
      className={cn(
        'rounded-3xl border border-border bg-card bb-shadow-sm',
        isDashboard
          ? 'md:flex-1 md:min-h-0 md:flex md:flex-col p-5 md:p-5 h-full'
          : 'p-5 md:p-7',
      )}
    >
      <HomeSectionHeader
        compact={isDashboard}
        icon={
          <ShoppingCart className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        }
        title="รายการที่ต้องสั่งซื้อ"
        actions={
          <>
            <HomeSectionBadge
              tone={itemsToOrder.length > 0 ? 'alert' : 'neutral'}
              icon={<Package className="h-3.5 w-3.5 opacity-70" aria-hidden />}
            >
              {itemsToOrder.length} รายการ
            </HomeSectionBadge>
            <NavPreloadLink href={inventoryHref} className={homeSectionLinkClassName()}>
              คลังสินค้า
              <ArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
            </NavPreloadLink>
          </>
        }
      />

      {itemsToOrder.length > 0 && poSources.length > 0 ? (
        <div
          className={cn(
            'mb-4 -mx-1 px-1 overflow-x-auto bb-smooth-scroll bb-smooth-scroll-chain-y shrink-0 pb-3 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            isDashboard && 'md:mb-2.5',
          )}
        >
          <FilterChipBar
            chips={sourceChips}
            selected={selectedChannels}
            onToggle={handleSourceToggle}
            ariaLabel="กรองตามแหล่งที่มาสินค้า"
          />
        </div>
      ) : null}

      {itemsToOrder.length === 0 ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-4 text-center',
            isDashboard ? 'md:flex-1 py-8' : 'py-12',
          )}
        >
          <ShoppingCart className="h-10 w-10 text-muted-foreground/25 mb-3" aria-hidden />
          <p className="text-[15px] text-muted-foreground font-normal">ไม่มีรายการที่ต้องสั่งซื้อ</p>
          <p className="mt-1 text-[13px] text-muted-foreground/70">สต็อกทุกรายการอยู่ในระดับที่กำหนด</p>
        </div>
      ) : displayedPoItems.length === 0 ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-4 text-center',
            isDashboard ? 'md:flex-1 py-8' : 'py-10',
          )}
        >
          <p className="text-[14px] text-muted-foreground">ไม่มีรายการในแหล่งที่เลือก</p>
        </div>
      ) : (
        <>
          <div className="md:hidden max-h-[min(60svh,28rem)] overflow-y-auto bb-smooth-scroll -mx-1 px-1">
            <div className="space-y-2.5">
              {displayedPoItems.map((item, idx) => (
                <PurchaseOrderRow key={item.id} item={item} index={idx} />
              ))}
            </div>
          </div>

          <div
            className={cn(
              'hidden md:block rounded-2xl border border-border overflow-hidden bb-shadow-sm',
              isDashboard && 'md:flex-1 md:min-h-0 md:flex md:flex-col',
            )}
          >
            <div
              className={cn(
                'overflow-y-auto bb-smooth-scroll',
                isDashboard ? 'md:flex-1 md:min-h-0' : 'max-h-[min(55vh,24rem)]',
              )}
            >
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
                  <tr className="border-b border-border">
                    <th className="py-2.5 px-3 text-[11px] font-normal text-muted-foreground text-center w-10 uppercase tracking-[0.12em]">
                      #
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-normal text-muted-foreground uppercase tracking-[0.12em]">
                      ชื่อรายการ
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-normal text-muted-foreground text-center w-24 uppercase tracking-[0.12em]">
                      จำนวนสั่ง
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-normal text-muted-foreground text-center w-20 uppercase tracking-[0.12em]">
                      คงเหลือ
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-normal text-muted-foreground text-center w-16 uppercase tracking-[0.12em]">
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
