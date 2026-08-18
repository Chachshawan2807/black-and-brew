import type { InventoryStockFields } from '@/lib/inventory-stock';

export function isWithdrawRequiredItem(item: { count_policy?: string | null }): boolean {
  return item.count_policy !== 'sufficiency_check';
}

export function filterWithdrawRequiredItems<T extends InventoryStockFields>(
  items: T[],
): T[] {
  return items.filter(isWithdrawRequiredItem);
}

function sortWithdrawRequiredItemsByName<T extends InventoryStockFields>(items: T[]): T[] {
  return items
    .slice()
    .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'th'));
}

export function parseWithdrawRequiredOrder(settings: unknown): string[] {
  if (!settings || typeof settings !== 'object') return [];
  const order = (settings as { order?: unknown }).order;
  if (!Array.isArray(order)) return [];
  return order.filter((id): id is string => typeof id === 'string');
}

export function applyWithdrawRequiredItemOrder<T extends InventoryStockFields & { id: string }>(
  items: T[],
  orderIds: string[] = [],
): T[] {
  const filtered = filterWithdrawRequiredItems(items);
  if (orderIds.length === 0) {
    return sortWithdrawRequiredItemsByName(filtered);
  }

  const byId = new Map(filtered.map((item) => [item.id, item]));
  const ordered: T[] = [];

  for (const id of orderIds) {
    const item = byId.get(id);
    if (!item) continue;
    ordered.push(item);
    byId.delete(id);
  }

  return [...ordered, ...sortWithdrawRequiredItemsByName(Array.from(byId.values()))];
}
