-- Refactor count accuracy: compare against system stock (inventory_items.stock),
-- not IN/OUT ledger replay. Clear legacy verification rows from the old formula.

DELETE FROM public.inventory_count_verifications;

ALTER TABLE public.inventory_count_verifications
  RENAME COLUMN in_out_theoretical_qty TO system_stock_qty;

COMMENT ON COLUMN public.inventory_count_verifications.system_stock_qty IS
  'Stock in inventory_items at count time, before the count update is applied';
