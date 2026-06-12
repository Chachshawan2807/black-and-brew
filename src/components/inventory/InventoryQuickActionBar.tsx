'use client';

import {
  Search,
  ShoppingCart,
  PlusCircle,
  History,
  PackagePlus,
  PackageMinus,
  SlidersHorizontal,
  CloudUpload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuickBadgeStyles } from '@/lib/inventory-stock';
import { INVENTORY_QUICK_ACTION_COLORS } from '@/lib/shift-colors';

export type QuickActionItem = {
  id: string;
  name: string;
  stock: number;
  target_stock: number;
  unit: string;
};

export type FrequentItem = { id: string; name: string };

export type InventoryQuickActionBarProps = {
  quickSearch: string;
  setQuickSearch: (value: string) => void;
  quickQty: string;
  setQuickQty: (value: string) => void;
  quickType: 'IN' | 'OUT' | 'ADJUST';
  setQuickType: (type: 'IN' | 'OUT' | 'ADJUST') => void;
  isSearchFocused: boolean;
  setIsSearchFocused: (focused: boolean) => void;
  filteredItems: QuickActionItem[];
  selectedQuickItem?: QuickActionItem;
  quickBadgeStyles: QuickBadgeStyles;
  frequentItems: FrequentItem[];
  itemsToOrderCount: number;
  isQuickPending: boolean;
  isReadOnly: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onOpenPurchaseOrder: () => void;
  onOpenAddItem: () => void;
  onOpenHistory: () => void;
  className?: string;
};

export function InventoryQuickActionBar({
  quickSearch,
  setQuickSearch,
  quickQty,
  setQuickQty,
  quickType,
  setQuickType,
  isSearchFocused,
  setIsSearchFocused,
  filteredItems,
  selectedQuickItem,
  quickBadgeStyles,
  frequentItems,
  itemsToOrderCount,
  isQuickPending,
  isReadOnly,
  onSubmit,
  onOpenPurchaseOrder,
  onOpenAddItem,
  onOpenHistory,
  className,
}: InventoryQuickActionBarProps) {
  return (
    <div className={cn('w-full flex flex-col bg-card p-4 rounded-3xl border border-border shadow-sm', className)}>
      <form onSubmit={onSubmit} className="flex flex-col gap-2.5 w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full box-border mb-0">
          <div className="flex flex-row items-center gap-2 flex-1 w-full min-w-0">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
              <input
                type="text"
                placeholder="ค้นหาสินค้า..."
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="w-full h-11 pl-9 pr-3 rounded-xl bg-background border border-border text-base md:text-sm font-normal text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all antialiased"
              />

              {isSearchFocused && filteredItems.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-2 bg-card border border-border rounded-xl shadow-xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="max-h-[50vh] overflow-y-auto py-2">
                    {filteredItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setQuickSearch(item.name);
                          setIsSearchFocused(false);
                        }}
                        className="w-full text-left px-5 py-3 hover:bg-muted transition-colors flex items-center justify-between group"
                      >
                        <span className="text-[14px] text-foreground font-normal">{item.name}</span>
                        <span className="text-[12px] text-foreground/30 group-hover:text-foreground/50 transition-colors uppercase tracking-widest font-mono">
                          {item.stock} {item.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedQuickItem && (
              <div
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[14px] whitespace-nowrap shrink-0 transition-all duration-200 animate-in fade-in zoom-in-95 border',
                  quickBadgeStyles.bg,
                )}
              >
                <span className={cn('text-[13px]', quickBadgeStyles.label)}>คงเหลือ:</span>
                <span className={cn('font-normal antialiased font-mono', quickBadgeStyles.val)}>
                  {Number.isInteger(selectedQuickItem.stock)
                    ? selectedQuickItem.stock
                    : Number(selectedQuickItem.stock).toFixed(1)}
                </span>
                <span className={cn('text-[12px]', quickBadgeStyles.label)}>{selectedQuickItem.unit}</span>
              </div>
            )}
          </div>

          <div
            className={cn(
              'flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0',
              isReadOnly && 'pointer-events-none opacity-60',
            )}
          >
            <div className="flex flex-row items-center gap-2 flex-1 sm:flex-initial">
              <div className="w-20 sm:w-24 shrink-0">
                <input
                  type="number"
                  placeholder={quickType === 'ADJUST' ? 'จำนวนใหม่' : 'จำนวน'}
                  value={quickQty}
                  onChange={(e) => setQuickQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onSubmit(e as unknown as React.FormEvent);
                    }
                  }}
                  min="0"
                  step="any"
                  className="w-full h-11 text-base md:text-sm font-normal px-2 text-center rounded-xl bg-background border border-border placeholder:text-muted-foreground text-foreground outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all antialiased"
                />
              </div>

              <div
                className={cn(
                  'flex-1 sm:flex-initial flex items-center p-1 rounded-full shrink-0 h-11 min-w-0',
                  INVENTORY_QUICK_ACTION_COLORS.toggleTrack,
                )}
              >
                <button
                  type="button"
                  onClick={() => setQuickType('IN')}
                  title="รับเข้า"
                  aria-label="รับเข้า"
                  className={cn(
                    'flex-1 min-w-0 flex items-center justify-center px-2 sm:px-3 h-full text-[13px] sm:text-sm font-normal rounded-full transition-all duration-150 antialiased',
                    quickType === 'IN' ? INVENTORY_QUICK_ACTION_COLORS.in : INVENTORY_QUICK_ACTION_COLORS.inactive,
                  )}
                >
                  <PackagePlus
                    className={cn(
                      'w-4 h-4 shrink-0 sm:mr-1 transition-colors',
                      quickType === 'IN' ? 'text-foreground' : 'text-foreground/40',
                    )}
                  />
                  <span className="hidden sm:inline truncate">รับเข้า</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickType('OUT')}
                  title="นำออก"
                  aria-label="นำออก"
                  className={cn(
                    'flex-1 min-w-0 flex items-center justify-center px-2 sm:px-3 h-full text-[13px] sm:text-sm font-normal rounded-full transition-all duration-150 antialiased',
                    quickType === 'OUT' ? INVENTORY_QUICK_ACTION_COLORS.out : INVENTORY_QUICK_ACTION_COLORS.inactive,
                  )}
                >
                  <PackageMinus
                    className={cn(
                      'w-4 h-4 shrink-0 sm:mr-1 transition-colors',
                      quickType === 'OUT' ? 'text-foreground' : 'text-foreground/40',
                    )}
                  />
                  <span className="hidden sm:inline truncate">นำออก</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuickType('ADJUST')}
                  title="ปรับจำนวน"
                  aria-label="ปรับจำนวน"
                  className={cn(
                    'flex-1 min-w-0 flex items-center justify-center px-2 sm:px-3 h-full text-[13px] sm:text-sm font-normal rounded-full transition-all duration-150 antialiased',
                    quickType === 'ADJUST' ? INVENTORY_QUICK_ACTION_COLORS.adjust : INVENTORY_QUICK_ACTION_COLORS.inactive,
                  )}
                >
                  <SlidersHorizontal
                    className={cn(
                      'w-4 h-4 shrink-0 sm:mr-1 transition-colors',
                      quickType === 'ADJUST' ? 'text-foreground' : 'text-foreground/40',
                    )}
                  />
                  <span className="hidden min-[420px]:inline truncate">ปรับจำนวน</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isQuickPending || isReadOnly}
              className="w-full sm:w-auto px-4 h-11 bb-pastel-surface bg-[#d1ecf1] border border-[#bee5eb] hover:brightness-95 text-[#000000] rounded-xl text-base md:text-sm font-normal transition-all shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap antialiased shrink-0 disabled:opacity-50"
            >
              <CloudUpload className="w-4 h-4" strokeWidth={1.5} /> บันทึก
            </button>
          </div>
        </div>

        <div className={cn('grid grid-cols-3 gap-2 w-full box-border', isReadOnly && 'pointer-events-none opacity-60')}>
          <button
            type="button"
            onClick={onOpenPurchaseOrder}
            className={cn(
              'flex items-center justify-center gap-1 px-1 h-11 rounded-3xl text-base md:text-sm font-normal antialiased transition-all hover:shadow-sm',
              INVENTORY_QUICK_ACTION_COLORS.order,
              'hover:bg-[#c3e6cb]/60',
            )}
          >
            <ShoppingCart className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span className="truncate">สั่งซื้อ</span>
            {itemsToOrderCount > 0 && (
              <span className="bb-pastel-surface bg-[#c3e6cb] text-[10px] px-1.5 py-0.5 rounded-full font-normal shrink-0 border border-[#b8dfc4]">
                {itemsToOrderCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onOpenAddItem}
            className={cn(
              'flex items-center justify-center gap-1.5 px-1 h-11 rounded-3xl text-base md:text-sm font-normal antialiased transition-all hover:shadow-sm',
              INVENTORY_QUICK_ACTION_COLORS.addItem,
              'hover:bg-[#ffeeba]/70',
            )}
          >
            <PlusCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span className="truncate">เพิ่มสินค้า</span>
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            className={cn(
              'flex items-center justify-center gap-1.5 px-1 h-11 rounded-3xl text-base md:text-sm font-normal antialiased transition-all hover:shadow-sm',
              INVENTORY_QUICK_ACTION_COLORS.history,
              'hover:bg-[#bee5eb]/70',
            )}
          >
            <History className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span className="truncate">ประวัติ</span>
          </button>
        </div>
      </form>

      {frequentItems.length > 0 && (
        <div
          className={cn(
            'flex items-center gap-2 mt-6 pt-3 border-t border-border overflow-x-auto pb-1 scrollbar-hide',
            isReadOnly && 'pointer-events-none opacity-60',
          )}
        >
          <span className="text-[12px] text-foreground/40 font-normal whitespace-nowrap">รายการใช้บ่อย:</span>
          {frequentItems.map((fi) => (
            <button
              key={fi.id}
              type="button"
              onClick={() => setQuickSearch(fi.name)}
              className="px-3 py-1.5 min-h-[44px] md:min-h-0 bg-muted hover:bg-muted/80 border border-border rounded-full text-base md:text-[13px] text-foreground/70 whitespace-nowrap transition-colors flex items-center justify-center"
            >
              {fi.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
