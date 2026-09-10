export type InventoryStockFields = {
  id: string;
  name?: string;
  stock?: number | string | null;
  order_qty?: number | string | null;
  order_point?: number | string | null;
  target_stock?: number | string | null;
  count_policy?: string | null;
  unit?: string;
  source?: string;
  sort_order?: number;
  updated_at?: string;
  [key: string]: unknown;
};

/** Merge partial Supabase realtime payloads without dropping existing row fields. */
export function mergeInventoryRealtimeUpdate<T extends InventoryStockFields>(
  existing: T,
  incoming: Partial<T> & { id: string }
): T {
  return { ...existing, ...incoming };
}

export function sanitizeStockValue(value: unknown): number {
  if (value === '' || value === null || value === undefined) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

/** Inventory UI: always show numeric zero as "0" (never blank). */
export function formatInventoryNumericDisplay(value: unknown): string {
  const num = sanitizeStockValue(value);
  return String(num);
}

/** DEC-005: same predicate as the purchase-order modal (single source of truth). */
export function isItemNeedingReorder(
  stock: unknown,
  orderPoint: unknown,
  targetStock: unknown
): boolean {
  const s = sanitizeStockValue(stock);
  const op = sanitizeStockValue(orderPoint);
  const ts = sanitizeStockValue(targetStock);
  return s <= op && ts > s;
}

/** DEC-005: computed order quantity from stock thresholds. */
export function computeOrderQty(
  stock: number,
  orderPoint: number,
  targetStock: number
): number {
  if (isItemNeedingReorder(stock, orderPoint, targetStock)) {
    return Math.max(0, targetStock - stock);
  }
  return 0;
}

export type PurchaseOrderCandidate = InventoryStockFields & {
  computedOrderQty: number;
};

/** Tailwind classes for stock column / badge coloring (vs order point). */
export function getStockColorClass(stock: number, orderPoint: number): string {
  return stock > orderPoint ? 'text-green-600' : 'text-red-600';
}

export type QuickBadgeStyles = {
  bg: string;
  label: string;
  val: string;
};

/** Pastel badge styles for the Quick Action stock indicator (vs order point). */
export function getQuickBadgeStyles(stock: number, orderPoint: number): QuickBadgeStyles {
  if (stock > orderPoint) {
    return { bg: 'bg-emerald-50/60 border-emerald-100/70', label: 'text-emerald-600/70', val: 'text-emerald-900' };
  }
  return { bg: 'bg-red-50/60 border-red-100/70', label: 'text-red-600/70', val: 'text-red-900' };
}

/** Derive purchase-order list from inventory items (single source of truth). */
export function computeItemsToOrder<T extends InventoryStockFields>(
  items: T[]
): Array<T & { computedOrderQty: number }> {
  return items.flatMap((item) => {
    const stock = sanitizeStockValue(item.stock);
    const orderPoint = sanitizeStockValue(item.order_point);
    const targetStock = sanitizeStockValue(item.target_stock);
    if (!isItemNeedingReorder(stock, orderPoint, targetStock)) return [];

    return {
      ...item,
      computedOrderQty: computeOrderQty(stock, orderPoint, targetStock),
    };
  });
}

export const INVENTORY_SOURCE_UNSPECIFIED_LABEL = 'ไม่ได้ระบุแหล่งที่มา';

export function inventorySourceLabel(item: Pick<InventoryStockFields, 'source'>): string {
  return item.source || INVENTORY_SOURCE_UNSPECIFIED_LABEL;
}

/** Unique ordering-channel labels across the full inventory grid. */
export function getInventoryGridSources<T extends InventoryStockFields>(items: T[]): string[] {
  return Array.from(new Set(items.map((item) => inventorySourceLabel(item))));
}

/** Filter warehouse grid rows by selected ordering channels. */
export function filterInventoryItemsBySources<T extends InventoryStockFields>(
  items: T[],
  selectedSources: string[] = ['all'],
): T[] {
  if (selectedSources.includes('all')) return items;
  return items.filter((item) => selectedSources.includes(inventorySourceLabel(item)));
}

export function toggleInventorySourceSelection(
  previous: string[],
  sourceId: string,
  allId = 'all',
): string[] {
  if (sourceId === allId) return [allId];

  let next = previous.filter((entry) => entry !== allId);
  if (next.includes(sourceId)) {
    next = next.filter((entry) => entry !== sourceId);
  } else {
    next = [...next, sourceId];
  }
  return next.length === 0 ? [allId] : next;
}

export function computePurchaseOrderDerivedState<T extends InventoryStockFields>(
  items: T[],
  selectedChannels: string[] = ['all'],
  options?: {
    /** Hidden from the “ทั้งหมด” tab; still listed when that source tab is selected. */
    excludeFromAllSources?: string[];
  },
) {
  const itemsToOrder = computeItemsToOrder(items);
  const poSources = Array.from(new Set(itemsToOrder.map((item) => inventorySourceLabel(item))));
  const excludeFromAll = new Set(options?.excludeFromAllSources ?? []);
  const displayedPoItems = selectedChannels.includes('all')
    ? itemsToOrder.filter((item) => !excludeFromAll.has(inventorySourceLabel(item)))
    : itemsToOrder.filter((item) => selectedChannels.includes(inventorySourceLabel(item)));
  const allTabItemCount = itemsToOrder.filter(
    (item) => !excludeFromAll.has(inventorySourceLabel(item)),
  ).length;

  return {
    itemsToOrder,
    poSources,
    displayedPoItems,
    allTabItemCount,
  };
}

/** Purchase-order rows for สาขา 2 same list as PO modal filtered to that channel. */
export const BRANCH_WITHDRAW_ORDER_SOURCE = 'สาขา 2';

export function computeBranchWithdrawItems<T extends InventoryStockFields>(
  items: T[],
): Array<T & { computedOrderQty: number }> {
  return computePurchaseOrderDerivedState(items, [BRANCH_WITHDRAW_ORDER_SOURCE]).displayedPoItems;
}
