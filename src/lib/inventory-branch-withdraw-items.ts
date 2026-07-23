import { computeBranchWithdrawItems, type InventoryStockFields } from '@/lib/inventory-stock';

export type BranchWithdrawDisplayItem = InventoryStockFields & {
  id: string;
  name: string;
  unit: string;
  sort_order: number;
  computedOrderQty: number;
  isManual: boolean;
};

export function buildBranchWithdrawDisplayItems<T extends InventoryStockFields>(
  allItems: T[],
  extraItemIds: string[],
): BranchWithdrawDisplayItem[] {
  const branchItems = computeBranchWithdrawItems(allItems);
  const branchIds = new Set(branchItems.map((item) => item.id));
  const itemsById = new Map(allItems.map((item) => [item.id, item]));

  const manualItems: BranchWithdrawDisplayItem[] = [];
  for (const itemId of extraItemIds) {
    if (branchIds.has(itemId)) continue;
    const item = itemsById.get(itemId);
    if (!item) continue;
    manualItems.push({
      ...item,
      id: item.id,
      name: (item.name as string) ?? '—',
      unit: (item.unit as string) ?? '',
      sort_order: (item.sort_order as number) ?? 0,
      computedOrderQty: 0,
      isManual: true,
    });
  }

  const autoItems: BranchWithdrawDisplayItem[] = branchItems.map((item) => ({
    ...item,
    id: item.id,
    name: (item.name as string) ?? '—',
    unit: (item.unit as string) ?? '',
    sort_order: (item.sort_order as number) ?? 0,
    computedOrderQty: item.computedOrderQty,
    isManual: false,
  }));

  return [...autoItems, ...manualItems].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function getAvailableBranchWithdrawPickItems<T extends InventoryStockFields & { id: string; name: string }>(
  allItems: T[],
  displayedItemIds: Set<string>,
): T[] {
  return allItems
    .filter((item) => !displayedItemIds.has(item.id))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, 'th'));
}
