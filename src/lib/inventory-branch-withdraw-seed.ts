import type { InventoryRealtimeItem } from '@/contexts/InventoryRealtimeContext';
import type { SecretaryReorderItem } from '@/lib/secretary/types';
import type { InventoryStockFields } from '@/lib/inventory-stock';

/** Maps raw inventory rows into secretary catalog shape for instant branch-withdraw pick lists. */
export function mapInventoryRowsToCatalogSeed<
  T extends InventoryStockFields & { id: string; name: string; source?: string | null },
>(items: T[]): SecretaryReorderItem[] {
  return items.map((item) => ({
    ...item,
    id: String(item.id),
    name: String(item.name),
    source: item.source ?? null,
    computedOrderQty: 0,
  }));
}

/** Maps secretary snapshot reorder rows into inventory realtime shape for instant overlay paint. */
export function mapSecretaryReorderItemsToInventoryRealtime(
  items: SecretaryReorderItem[],
): InventoryRealtimeItem[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    stock: Number(item.stock) || 0,
    order_qty: Number(item.order_qty) || 0,
    order_point: item.order_point == null ? 0 : Number(item.order_point),
    target_stock: Number(item.target_stock) || 0,
    unit: item.unit ?? '',
    source: item.source ?? '',
    sort_order: Number(item.sort_order) || 0,
    updated_at: typeof item.updated_at === 'string' ? item.updated_at : '',
    count_policy: typeof item.count_policy === 'string' ? item.count_policy : null,
  }));
}
