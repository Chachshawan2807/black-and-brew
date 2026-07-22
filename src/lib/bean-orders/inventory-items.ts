/** Roasted bean SKUs in inventory — only these appear in bean order line items. */
export const BEAN_ORDER_INVENTORY_ITEM_NAMES = [
  'เมล็ดกาแฟคั่วเข้ม',
  'เมล็ดกาแฟคั่วกลาง',
  'เมล็ดกาแฟคั่วอ่อน',
] as const;

export type BeanOrderInventoryItemName = (typeof BEAN_ORDER_INVENTORY_ITEM_NAMES)[number];

export function filterBeanOrderInventoryItems(
  items: { id: string; name: string }[],
): { id: string; name: string }[] {
  const byName = new Map(items.map((item) => [item.name, item]));
  return BEAN_ORDER_INVENTORY_ITEM_NAMES.flatMap((name) => {
    const item = byName.get(name);
    return item ? [item] : [];
  });
}
