export type InventoryStockFields = {
  id: string;
  name?: string;
  stock?: number | string | null;
  order_qty?: number | string | null;
  order_point?: number | string | null;
  target_stock?: number | string | null;
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

/** Tailwind classes for stock column / badge coloring. */
export function getStockColorClass(stock: number, targetStock: number): string {
  if (stock <= targetStock) return 'text-red-600';
  if (stock <= targetStock + 1) return 'text-orange-500';
  return 'text-green-600';
}

export type QuickBadgeStyles = {
  bg: string;
  label: string;
  val: string;
};

/** Pastel badge styles for the Quick Action stock indicator. */
export function getQuickBadgeStyles(stock: number, targetStock: number): QuickBadgeStyles {
  if (stock <= targetStock) {
    return { bg: 'bg-red-50/60 border-red-100/70', label: 'text-red-600/70', val: 'text-red-900' };
  }
  if (stock <= targetStock + 1) {
    return { bg: 'bg-orange-50/60 border-orange-100/70', label: 'text-orange-600/70', val: 'text-orange-900' };
  }
  return { bg: 'bg-emerald-50/60 border-emerald-100/70', label: 'text-emerald-600/70', val: 'text-emerald-900' };
}

/** Derive purchase-order list from inventory items (single source of truth). */
export function computeItemsToOrder<T extends InventoryStockFields>(
  items: T[]
): Array<T & { computedOrderQty: number }> {
  return items
    .filter((item) =>
      isItemNeedingReorder(item.stock, item.order_point, item.target_stock)
    )
    .map((item) => {
      const stock = sanitizeStockValue(item.stock);
      const orderPoint = sanitizeStockValue(item.order_point);
      const targetStock = sanitizeStockValue(item.target_stock);
      return {
        ...item,
        computedOrderQty: computeOrderQty(stock, orderPoint, targetStock),
      };
    });
}
