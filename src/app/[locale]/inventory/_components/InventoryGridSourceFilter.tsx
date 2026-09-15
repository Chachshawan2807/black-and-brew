'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Truck } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { FilterChipBar } from '@/components/ui/segment-tab-bar';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { bbPastelClass } from '@/lib/ui-outlined-tokens';
import { inventorySourceLabel, toggleInventorySourceSelection } from '@/lib/inventory-stock';
import type { InventoryItem } from '../types';
import { INVENTORY_MOTION_SAFE, INVENTORY_PASTEL_ACTION, INVENTORY_PASTEL_ACTION_PAIR, useInventoryMotion } from './inventory-ui-primitives';

type InventoryGridSourceFilterProps = {
  items: InventoryItem[];
  sources: string[];
  selectedSources: string[];
  onSelectedSourcesChange: React.Dispatch<React.SetStateAction<string[]>>;
  filteredCount: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

export function InventoryGridSourceFilterButton({
  filteredCount,
  expanded,
  onExpandedChange,
  isActive,
}: {
  filteredCount: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  isActive: boolean;
}) {
  return (
    <HintTooltip tip="กรองตามช่องทางสั่งซื้อ">
      <button
        type="button"
        aria-label="กรองตามช่องทางสั่งซื้อ"
        aria-expanded={expanded}
        aria-controls="inventory-grid-source-filter-panel"
        aria-pressed={isActive}
        onClick={() => onExpandedChange(!expanded)}
        className={cn(
          INVENTORY_PASTEL_ACTION,
          INVENTORY_PASTEL_ACTION_PAIR,
          bbPastelClass('bg-[#fef3c7]'),
          isActive && 'ring-1 ring-amber-500/35',
        )}
      >
        <Truck className="w-4 h-4 shrink-0" strokeWidth={1.5} aria-hidden />
        <span className="min-w-0 text-center">ช่องทาง</span>
        {isActive ? (
          <span
            className={cn(
              bbPastelClass('bg-[#fde68a]/70'),
              'shrink-0 rounded-full px-2 py-0.5 text-[11px] tabular-nums',
            )}
          >
            {filteredCount}
          </span>
        ) : null}
      </button>
    </HintTooltip>
  );
}

export function InventoryGridSourceFilterPanel({
  items,
  sources,
  selectedSources,
  onSelectedSourcesChange,
  onExpandedChange,
  expanded,
}: InventoryGridSourceFilterProps) {
  const { micro } = useInventoryMotion();

  const sourceChips = useMemo(
    () => [
      { id: 'all', label: 'ทั้งหมด', count: items.length },
      ...sources.map((source) => ({
        id: source,
        label: source,
        count: items.filter((item) => inventorySourceLabel(item) === source).length,
      })),
    ],
    [items, sources],
  );

  const handleToggle = (id: string) => {
    onSelectedSourcesChange((prev) => toggleInventorySourceSelection(prev, id));
    if (id !== 'all') {
      onExpandedChange(true);
    }
  };

  return (
    <AnimatePresence initial={false}>
      {expanded ? (
        <motion.div
          id="inventory-grid-source-filter-panel"
          key="inventory-grid-source-filter-panel"
          initial={micro.initial}
          animate={micro.animate}
          exit={micro.exit}
          transition={micro.transition}
          className={cn(
            'overflow-x-auto bb-smooth-scroll bb-smooth-scroll-chain-y -mx-1 px-1 sm:mx-0 sm:px-0',
            INVENTORY_MOTION_SAFE,
          )}
        >
          <FilterChipBar
            chips={sourceChips}
            selected={selectedSources}
            onToggle={handleToggle}
            ariaLabel="กรองรายการตามช่องทางสั่งซื้อ"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
