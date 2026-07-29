export type InventoryTransactionRpcResult = {
  success?: boolean;
  old_stock?: number | null;
  new_stock?: number | null;
  balance_after?: number | null;
  order_point?: number | null;
};

/**
 * Resolve before/after stock for audit + notifications.
 * Prefer RPC `old_stock`; if omitted, reconstruct from new stock + IN/OUT quantity
 * so notifications never show a false "คงเหลือ: 0 → …".
 */
export function resolveRecordedStockChange(
  data: InventoryTransactionRpcResult | null | undefined,
  type: 'IN' | 'OUT',
  quantity: number,
): { oldStock: number | null; newStock: number | null } {
  const rawNew = data?.new_stock ?? data?.balance_after ?? null;
  if (rawNew == null || Number.isNaN(Number(rawNew))) {
    return { oldStock: null, newStock: null };
  }

  const newStock = Number(rawNew);
  const rawOld = data?.old_stock;
  if (rawOld != null && !Number.isNaN(Number(rawOld))) {
    return { oldStock: Number(rawOld), newStock };
  }

  const qty = Number(quantity);
  if (Number.isNaN(qty)) {
    return { oldStock: null, newStock };
  }

  if (type === 'OUT') {
    return { oldStock: newStock + qty, newStock };
  }

  return { oldStock: newStock - qty, newStock };
}
