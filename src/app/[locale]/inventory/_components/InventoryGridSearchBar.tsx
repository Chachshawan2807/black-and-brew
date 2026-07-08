'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const handleClear = () => {
    setGridSearchQuery('');
  };

  return (
    <div className="rounded-3xl border border-border bg-card px-3 py-2.5 bb-shadow-sm">
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative min-w-0 flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
          <input
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
            className="h-10 w-full min-w-0 pl-9 pr-9 rounded-xl bg-background border border-border text-sm font-normal text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all antialiased"
          />
          {isFiltering && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="ล้างการค้นหา"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isFiltering && (
          <span
            className={cn(
              'shrink-0 text-[12px] tabular-nums text-muted-foreground whitespace-nowrap',
              filteredCount === 0 && 'text-amber-600 dark:text-amber-400',
            )}
          >
            {filteredCount}/{totalCount}
          </span>
        )}
      </div>
    </div>
  );
}
