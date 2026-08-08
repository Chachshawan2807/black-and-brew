export type PurchaseOrderCopyLine = {
  name?: string | null;
  computedOrderQty: number;
};

export function formatPurchaseOrderCopyQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : Number(qty).toFixed(1);
}

export function formatPurchaseOrderListCopyText(items: PurchaseOrderCopyLine[]): string {
  return items
    .map((item, index) => {
      const name = (item.name ?? '').trim() || '-';
      const qty = formatPurchaseOrderCopyQty(item.computedOrderQty);
      return `${index + 1}. ${name} = ${qty}`;
    })
    .join('\n');
}
