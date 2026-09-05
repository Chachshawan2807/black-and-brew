'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, ICON_STROKE } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { INVENTORY_MOTION_SAFE, useInventoryMotion } from './inventory-ui-primitives';

type InventoryGridSearchBarProps = {
  gridSearchQuery: string;
  setGridSearchQuery: (value: string) => void;
  filteredCount: number;
  totalCount: number;
  onEnter?: () => void;
};

export function InventoryGridSearchBar({
  gridSearchQuery,
  setGridSearchQuery,
  filteredCount,
  totalCount,
  onEnter,
}: InventoryGridSearchBarProps) {
  const isFiltering = gridSearchQuery.trim().length > 0;
  const { micro } = useInventoryMotion();

  const handleClear = () => {
    setGridSearchQuery('');
  };

  return (
    <div className="rounded-3xl border border-border bg-card px-3 py-2.5 bb-shadow-sm bb-transition duration-200 focus-within:border-foreground/20 focus-within:bb-shadow-md">
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative min-w-0 flex-1">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10"
            strokeWidth={ICON_STROKE}
            aria-hidden
          />
          <input
            id="inventory-grid-search"
            name="inventory-grid-search"
            type="text"
            enterKeyHint="search"
            placeholder="ค้นหารายการเพื่อแก้ไข..."
            value={gridSearchQuery}
            onChange={(e) => setGridSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onEnter?.();
              }
              if (e.key === 'Escape') {
                handleClear();
              }
            }}
            title={gridSearchQuery || undefined}
            aria-label="ค้นหารายการเพื่อแก้ไข"
            className="h-10 w-full min-w-0 pl-9 pr-9 rounded-xl bg-background border border-border text-sm font-normal text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/10 bb-transition antialiased"
          />
          <AnimatePresence initial={false}>
            {isFiltering ? (
              <motion.button
                key="clear-search"
                type="button"
                onClick={handleClear}
                aria-label="ล้างการค้นหา"
                initial={micro.initial}
                animate={micro.animate}
                exit={micro.exit}
                transition={micro.transition}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted bb-transition duration-200 active:scale-95 motion-reduce:active:scale-100"
              >
                <X className="w-4 h-4" strokeWidth={ICON_STROKE} />
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatePresence initial={false}>
          {isFiltering ? (
            <motion.span
              key="filter-count"
              initial={micro.initial}
              animate={micro.animate}
              exit={micro.exit}
              transition={micro.transition}
              className={cn(
                'shrink-0 text-[12px] tabular-nums text-muted-foreground whitespace-nowrap rounded-full border border-border bg-muted/30 px-2 py-0.5',
                INVENTORY_MOTION_SAFE,
                filteredCount === 0 && 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20',
              )}
            >
              {filteredCount}/{totalCount}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
