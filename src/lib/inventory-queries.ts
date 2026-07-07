/** Shared column presets for inventory_items — keeps client/server selects aligned. */
export const INVENTORY_ITEM_SELECT =
  'id, name, stock, order_qty, order_point, target_stock, unit, source, sort_order, updated_at, count_policy';

export const INVENTORY_COUNT_SELECT = 'id, name, stock, unit, sort_order, count_policy';
