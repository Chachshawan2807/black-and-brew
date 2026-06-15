'use client';

import { useRef } from 'react';
import {
  Search,
  ShoppingCart,
  PlusCircle,
  History,
  PackagePlus,
  PackageMinus,
  SlidersHorizontal,
  CloudUpload,
  ChevronUp,
  ChevronDown,
  List,
  Layers,
  ClipboardPaste,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuickBadgeStyles } from '@/lib/inventory-stock';
import { INVENTORY_QUICK_ACTION_COLORS } from '@/lib/shift-colors';
import { shouldShowQuickSearchSuggestions } from '@/lib/inventory-quick-search-filter';
import { stepQuickQtyValue } from '@/lib/inventory-quick-qty-step';
import type { BulkPreview, BulkQueueItem } from '@/lib/inventory-quick-bulk';
import { HintTooltip } from '@/components/ui/hint-tooltip';

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
  bulkMode?: boolean;
  onBulkModeChange?: (bulk: boolean) => void;
  bulkQueue?: BulkQueueItem[];
  bulkPreviews?: { line: BulkQueueItem; preview: BulkPreview }[];
  bulkSubmitReady?: boolean;
  onSelectBulkItem?: (item: QuickActionItem) => void;
  onAddBulkFromSearch?: () => void;
  onBulkPaste?: (text: string) => void;
  onRemoveBulkItem?: (itemId: string) => void;
  onBulkLineQtyChange?: (itemId: string, qty: string) => void;
  onClearBulkQueue?: () => void;
};

const ACTION_CELL_CLASS = 'min-w-0 w-full';

function QuickActionTypeToggle({
  quickType,
  setQuickType,
  className,
  bulkMode = false,
}: {
  quickType: 'IN' | 'OUT' | 'ADJUST';
  setQuickType: (type: 'IN' | 'OUT' | 'ADJUST') => void;
  className?: string;
  bulkMode?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex w-full items-center p-0.5 rounded-full h-11',
        INVENTORY_QUICK_ACTION_COLORS.toggleTrack,
        className,
      )}
      role="group"
      aria-label="ประเภทการปรับสต็อก"
    >
      <HintTooltip tip="รับเข้า">
        <button
          type="button"
          onClick={() => setQuickType('IN')}
          aria-label="รับเข้า"
          aria-pressed={quickType === 'IN'}
          className={cn(
            'flex-1 flex items-center justify-center h-full rounded-full transition-all duration-150',
            quickType === 'IN' ? INVENTORY_QUICK_ACTION_COLORS.in : INVENTORY_QUICK_ACTION_COLORS.inactive,
          )}
        >
          <PackagePlus className="w-4 h-4 shrink-0" strokeWidth={1.75} />
        </button>
      </HintTooltip>
      <HintTooltip tip="นำออก">
        <button
          type="button"
          onClick={() => setQuickType('OUT')}
          aria-label="นำออก"
          aria-pressed={quickType === 'OUT'}
          className={cn(
            'flex-1 flex items-center justify-center h-full rounded-full transition-all duration-150',
            quickType === 'OUT' ? INVENTORY_QUICK_ACTION_COLORS.out : INVENTORY_QUICK_ACTION_COLORS.inactive,
          )}
        >
          <PackageMinus className="w-4 h-4 shrink-0" strokeWidth={1.75} />
        </button>
      </HintTooltip>
      {!bulkMode && (
        <HintTooltip tip="ปรับจำนวน">
          <button
            type="button"
            onClick={() => setQuickType('ADJUST')}
            aria-label="ปรับจำนวน"
            aria-pressed={quickType === 'ADJUST'}
            className={cn(
              'flex-1 flex items-center justify-center h-full rounded-full transition-all duration-150',
              quickType === 'ADJUST' ? INVENTORY_QUICK_ACTION_COLORS.adjust : INVENTORY_QUICK_ACTION_COLORS.inactive,
            )}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          </button>
        </HintTooltip>
      )}
    </div>
  );
}

function QuickActionQtyInput({
  quickQty,
  setQuickQty,
  quickType,
  onSubmit,
  className,
  compact = false,
}: {
  quickQty: string;
  setQuickQty: (value: string) => void;
  quickType: 'IN' | 'OUT' | 'ADJUST';
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
  compact?: boolean;
}) {
  const step = (delta: number) => {
    setQuickQty(stepQuickQtyValue(quickQty, delta));
  };

  const stepBtnSize = compact ? 'h-4 w-5' : 'h-[1.3125rem] w-6';
  const stepIconSize = compact ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <div className="relative w-full">
      <input
        type="number"
        placeholder={quickType === 'ADJUST' ? 'ใหม่' : 'จำนวน'}
        value={quickQty}
        onChange={(e) => setQuickQty(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            step(1);
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            step(-1);
            return;
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit(e as unknown as React.FormEvent);
          }
        }}
        min="0"
        step="any"
        aria-label={quickType === 'ADJUST' ? 'จำนวนคงเหลือใหม่' : 'จำนวน'}
        className={cn(
          'w-full text-sm font-normal pl-1.5 pr-8 text-center rounded-3xl bg-background border border-border placeholder:text-muted-foreground text-foreground outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all antialiased',
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          compact ? 'h-9 rounded-xl' : 'h-11',
          className,
        )}
      />
      <HintTooltip tip="เพิ่มจำนวน">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => step(1)}
          aria-label="เพิ่มจำนวน"
          className={cn(
            'absolute right-0 top-0 flex items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm',
            'hover:bg-[#d4edda]/50 hover:border-[#c3e6cb] hover:text-foreground active:scale-95 transition-all',
            stepBtnSize,
          )}
        >
          <ChevronUp className={cn('shrink-0', stepIconSize)} strokeWidth={2} />
        </button>
      </HintTooltip>
      <HintTooltip tip="ลดจำนวน">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => step(-1)}
          aria-label="ลดจำนวน"
          className={cn(
            'absolute right-0 bottom-0 flex items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm',
            'hover:bg-[#f8d7da]/45 hover:border-[#f5c6cb] hover:text-foreground active:scale-95 transition-all',
            stepBtnSize,
          )}
        >
          <ChevronDown className={cn('shrink-0', stepIconSize)} strokeWidth={2} />
        </button>
      </HintTooltip>
    </div>
  );
}

function QuickActionSaveButton({
  isQuickPending,
  isReadOnly,
  className,
  bulkCount,
  bulkSubmitReady,
}: {
  isQuickPending: boolean;
  isReadOnly: boolean;
  className?: string;
  bulkCount?: number;
  bulkSubmitReady?: boolean;
}) {
  const bulkMode = bulkCount !== undefined;
  const disabled =
    isQuickPending || isReadOnly || (bulkMode && (!bulkCount || !bulkSubmitReady));

  return (
    <button
      type="submit"
      disabled={disabled}
      className={cn(
        'h-11 w-full bb-pastel-surface bg-[#d1ecf1] border border-[#bee5eb] hover:brightness-95 text-[#000000] rounded-3xl text-sm font-normal transition-all shadow-sm flex items-center justify-center gap-1 whitespace-nowrap antialiased disabled:opacity-50',
        className,
      )}
    >
      <CloudUpload className="w-4 h-4 shrink-0" strokeWidth={1.5} />
      <span>{bulkMode ? `บันทึก (${bulkCount})` : 'บันทึก'}</span>
    </button>
  );
}

function BulkModeToggle({
  bulkMode,
  onBulkModeChange,
}: {
  bulkMode: boolean;
  onBulkModeChange: (next: boolean) => void;
}) {
  return (
    <HintTooltip tip={bulkMode ? 'โหมดรายการเดียว' : 'โหมดหลายรายการ'}>
      <button
        type="button"
        onClick={() => onBulkModeChange(!bulkMode)}
        aria-label={bulkMode ? 'โหมดรายการเดียว' : 'โหมดหลายรายการ'}
        aria-pressed={bulkMode}
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all',
          bulkMode
            ? 'bb-pastel-surface bg-[#d1ecf1] border-[#bee5eb] text-[#000000]'
            : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/20',
        )}
      >
        {bulkMode ? <Layers className="w-4 h-4" strokeWidth={1.75} /> : <List className="w-4 h-4" strokeWidth={1.75} />}
      </button>
    </HintTooltip>
  );
}

function BulkQueueSummaryCell({
  count,
  onPaste,
  compact = false,
}: {
  count: number;
  onPaste?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex w-full items-center justify-between gap-1 rounded-3xl border border-border bg-muted/30 px-2 text-sm text-foreground antialiased',
        compact ? 'h-9 rounded-xl' : 'h-11',
      )}
    >
      <span className="truncate text-center flex-1 tabular-nums">{count} รายการ</span>
      {onPaste && (
        <HintTooltip tip="วางชื่อหลายรายการ">
          <button
            type="button"
            onClick={onPaste}
            aria-label="วางชื่อหลายรายการ"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
          >
            <ClipboardPaste className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </HintTooltip>
      )}
    </div>
  );
}

function BulkQueuePanel({
  bulkPreviews,
  onRemoveBulkItem,
  onBulkLineQtyChange,
  onClearBulkQueue,
}: {
  bulkPreviews: { line: BulkQueueItem; preview: BulkPreview }[];
  onRemoveBulkItem?: (itemId: string) => void;
  onBulkLineQtyChange?: (itemId: string, qty: string) => void;
  onClearBulkQueue?: () => void;
}) {
  if (bulkPreviews.length === 0) return null;

  return (
    <div className="w-full rounded-2xl border border-border bg-muted/15 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/70">
        <span className="text-[12px] text-muted-foreground">รายการในคิว — กรอกจำนวนแต่ละแถว</span>
        {onClearBulkQueue && bulkPreviews.length > 0 && (
          <button
            type="button"
            onClick={onClearBulkQueue}
            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            ล้างทั้งหมด
          </button>
        )}
      </div>
      <div className="max-h-[min(40vh,14rem)] overflow-y-auto bb-smooth-scroll divide-y divide-border/60">
        {bulkPreviews.map(({ line, preview }) => (
          <div
            key={line.itemId}
            className={cn(
              'flex items-center gap-2 px-3 py-2 min-w-0',
              preview.error && line.qty.trim() !== '' && 'bg-[#f8d7da]/20',
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm text-foreground truncate">{line.name}</div>
              <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                {preview.before} → {preview.after} {line.unit}
                {preview.error && line.qty.trim() !== '' ? ` · ${preview.error}` : ''}
              </div>
            </div>
            <input
              type="number"
              min="0"
              step="any"
              value={line.qty}
              onChange={(e) => onBulkLineQtyChange?.(line.itemId, e.target.value)}
              placeholder="จำนวน"
              aria-label={`จำนวน ${line.name}`}
              className="w-[4.5rem] shrink-0 h-9 rounded-xl border border-border bg-background text-center text-sm font-mono tabular-nums outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {onRemoveBulkItem && (
              <HintTooltip tip="ลบออกจากคิว">
                <button
                  type="button"
                  onClick={() => onRemoveBulkItem(line.itemId)}
                  aria-label={`ลบ ${line.name} ออกจากคิว`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </HintTooltip>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SecondaryQuickActionButtons({
  itemsToOrderCount,
  onOpenPurchaseOrder,
  onOpenAddItem,
  onOpenHistory,
}: {
  itemsToOrderCount: number;
  onOpenPurchaseOrder: () => void;
  onOpenAddItem: () => void;
  onOpenHistory: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onOpenPurchaseOrder}
        className={cn(
          'flex w-full items-center justify-center gap-1 px-1 h-11 rounded-3xl text-base md:text-sm font-normal antialiased transition-all hover:shadow-sm',
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
          'flex w-full items-center justify-center gap-1.5 px-1 h-11 rounded-3xl text-base md:text-sm font-normal antialiased transition-all hover:shadow-sm',
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
          'flex w-full items-center justify-center gap-1.5 px-1 h-11 rounded-3xl text-base md:text-sm font-normal antialiased transition-all hover:shadow-sm',
          INVENTORY_QUICK_ACTION_COLORS.history,
          'hover:bg-[#bee5eb]/70',
        )}
      >
        <History className="w-4 h-4 shrink-0" strokeWidth={1.5} />
        <span className="truncate">ประวัติ</span>
      </button>
    </>
  );
}

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
  bulkMode = false,
  onBulkModeChange,
  bulkQueue = [],
  bulkPreviews = [],
  bulkSubmitReady = false,
  onSelectBulkItem,
  onAddBulkFromSearch,
  onBulkPaste,
  onRemoveBulkItem,
  onBulkLineQtyChange,
  onClearBulkQueue,
}: InventoryQuickActionBarProps) {
  const searchRootRef = useRef<HTMLDivElement>(null);
  const showSuggestions = shouldShowQuickSearchSuggestions(
    isSearchFocused,
    quickSearch,
    filteredItems.length,
  );
  const handlePasteClick = () => {
    if (!onBulkPaste) return;
    void navigator.clipboard.readText().then((text) => {
      if (!text.trim()) {
        alert('ไม่พบข้อความในคลิปบอร์ด');
        return;
      }
      onBulkPaste(text);
    }).catch(() => {
      alert('ไม่สามารถอ่านคลิปบอร์ดได้');
    });
  };

  return (
    <div className={cn('w-full flex flex-col bg-card p-4 rounded-3xl border border-border shadow-sm', className)}>
      <form onSubmit={onSubmit} className="flex flex-col gap-2.5 w-full">
        <div
          className={cn(
            'flex flex-row flex-wrap sm:flex-nowrap items-center gap-2 w-full min-w-0 box-border',
            isReadOnly && 'pointer-events-none opacity-60',
          )}
        >
          <div
            className={cn(
              'flex flex-row items-center gap-1.5 min-w-0 w-full basis-full',
              'sm:basis-auto sm:flex-1 sm:min-w-0',
            )}
          >
            {onBulkModeChange && (
              <BulkModeToggle bulkMode={bulkMode} onBulkModeChange={onBulkModeChange} />
            )}
            <div
              ref={searchRootRef}
              className="relative min-w-0 w-full sm:flex-1 sm:min-w-[9rem]"
              onBlur={(e) => {
                const next = e.relatedTarget as Node | null;
                if (next && searchRootRef.current?.contains(next)) return;
                window.setTimeout(() => setIsSearchFocused(false), 200);
              }}
            >
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
              <input
                type="text"
                placeholder={bulkMode ? 'ค้นหาแล้วเพิ่มลงคิว...' : 'ค้นหาสินค้า...'}
                value={quickSearch}
                onChange={(e) => {
                  setQuickSearch(e.target.value);
                  if (bulkMode) setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={(e) => {
                  if (bulkMode && e.key === 'Enter') {
                    e.preventDefault();
                    onAddBulkFromSearch?.();
                  }
                }}
                title={quickSearch || undefined}
                className="h-10 w-full min-w-0 pl-9 pr-3 rounded-xl bg-background border border-border text-sm font-normal text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all antialiased"
              />

              {showSuggestions && (
                <div
                  className="absolute top-full left-0 z-[210] mt-2 min-w-[min(100%,14rem)] w-max max-w-[min(100vw-2rem,20rem)] bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="max-h-[min(50vh,16rem)] overflow-y-auto bb-smooth-scroll py-2">
                    {filteredItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (bulkMode && onSelectBulkItem) {
                            onSelectBulkItem(item);
                            setQuickSearch('');
                            setIsSearchFocused(true);
                          } else {
                            setQuickSearch(item.name);
                            setIsSearchFocused(false);
                          }
                        }}
                        className="w-full text-left px-5 py-3 hover:bg-muted transition-colors flex items-center justify-between gap-3 group min-w-0"
                      >
                        <span className="text-[14px] text-foreground font-normal truncate min-w-0 flex-1">
                          {item.name}
                        </span>
                        <span className="text-[12px] text-muted-foreground group-hover:text-foreground/70 transition-colors uppercase tracking-widest font-mono shrink-0 whitespace-nowrap">
                          {item.stock} {item.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!bulkMode && selectedQuickItem && (
              <div
                className={cn(
                  'flex h-10 shrink-0 items-center gap-1 px-2 rounded-xl text-[12px] border transition-all duration-200 animate-in fade-in zoom-in-95 whitespace-nowrap max-w-[40%] sm:max-w-none',
                  quickBadgeStyles.bg,
                )}
              >
                <span className={cn('shrink-0', quickBadgeStyles.label)}>คงเหลือ:</span>
                <span className={cn('font-normal antialiased font-mono shrink-0 tabular-nums', quickBadgeStyles.val)}>
                  {Number.isInteger(selectedQuickItem.stock)
                    ? selectedQuickItem.stock
                    : Number(selectedQuickItem.stock).toFixed(1)}
                </span>
                <span className={cn('shrink-0', quickBadgeStyles.label)}>{selectedQuickItem.unit}</span>
              </div>
            )}
          </div>

          <div
            className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-border/60 bg-muted/20 p-1"
            role="group"
            aria-label="จำนวน ประเภท และบันทึก"
          >
            <div className="w-[6rem] shrink-0">
              {bulkMode ? (
                <BulkQueueSummaryCell
                  count={bulkQueue.length}
                  onPaste={onBulkPaste ? handlePasteClick : undefined}
                  compact
                />
              ) : (
                <QuickActionQtyInput
                  quickQty={quickQty}
                  setQuickQty={setQuickQty}
                  quickType={quickType}
                  onSubmit={onSubmit}
                  compact
                />
              )}
            </div>
            <QuickActionTypeToggle
              quickType={quickType}
              setQuickType={setQuickType}
              bulkMode={bulkMode}
              className={cn('h-9', bulkMode ? 'w-[5rem]' : 'w-[6.25rem]')}
            />
            <QuickActionSaveButton
              isQuickPending={isQuickPending}
              isReadOnly={isReadOnly}
              bulkCount={bulkMode ? bulkQueue.length : undefined}
              bulkSubmitReady={bulkSubmitReady}
              className="h-9 w-auto px-2.5 rounded-xl"
            />
          </div>
        </div>

        {bulkMode && bulkPreviews.length > 0 && (
          <BulkQueuePanel
            bulkPreviews={bulkPreviews}
            onRemoveBulkItem={onRemoveBulkItem}
            onBulkLineQtyChange={onBulkLineQtyChange}
            onClearBulkQueue={onClearBulkQueue}
          />
        )}

        <div
          className={cn(
            'grid grid-cols-3 gap-2 w-full box-border sm:hidden',
            isReadOnly && 'pointer-events-none opacity-60',
          )}
        >
          <div className={ACTION_CELL_CLASS}>
            {bulkMode ? (
              <BulkQueueSummaryCell
                count={bulkQueue.length}
                onPaste={onBulkPaste ? handlePasteClick : undefined}
              />
            ) : (
              <QuickActionQtyInput
                quickQty={quickQty}
                setQuickQty={setQuickQty}
                quickType={quickType}
                onSubmit={onSubmit}
              />
            )}
          </div>
          <div className={ACTION_CELL_CLASS}>
            <QuickActionTypeToggle quickType={quickType} setQuickType={setQuickType} bulkMode={bulkMode} />
          </div>
          <div className={ACTION_CELL_CLASS}>
            <QuickActionSaveButton
              isQuickPending={isQuickPending}
              isReadOnly={isReadOnly}
              bulkCount={bulkMode ? bulkQueue.length : undefined}
              bulkSubmitReady={bulkSubmitReady}
            />
          </div>
          <SecondaryQuickActionButtons
            itemsToOrderCount={itemsToOrderCount}
            onOpenPurchaseOrder={onOpenPurchaseOrder}
            onOpenAddItem={onOpenAddItem}
            onOpenHistory={onOpenHistory}
          />
        </div>

        <div
          className={cn(
            'hidden sm:grid grid-cols-3 gap-2 w-full box-border',
            isReadOnly && 'pointer-events-none opacity-60',
          )}
        >
          <SecondaryQuickActionButtons
            itemsToOrderCount={itemsToOrderCount}
            onOpenPurchaseOrder={onOpenPurchaseOrder}
            onOpenAddItem={onOpenAddItem}
            onOpenHistory={onOpenHistory}
          />
        </div>
      </form>

      {frequentItems.length > 0 && (
        <div
          className={cn(
            'flex items-center gap-2 mt-6 pt-3 border-t border-border overflow-x-auto bb-smooth-scroll bb-smooth-scroll-chain-y pb-1 scrollbar-hide',
            isReadOnly && 'pointer-events-none opacity-60',
          )}
        >
          <span className="text-[12px] text-muted-foreground font-normal whitespace-nowrap">รายการใช้บ่อย:</span>
          {frequentItems.map((fi) => (
            <button
              key={fi.id}
              type="button"
              onClick={() => {
                if (bulkMode && onSelectBulkItem) {
                  onSelectBulkItem({ id: fi.id, name: fi.name, stock: 0, target_stock: 0, unit: '' });
                  return;
                }
                setQuickSearch(fi.name);
              }}
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
