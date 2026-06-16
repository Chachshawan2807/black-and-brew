-- Refactor count accuracy: compare against system stock (inventory_items.stock),
-- not IN/OUT ledger replay. Clear legacy verification rows from the old formula.

DELETE FROM public.inventory_count_verifications;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventory_count_verifications'
      AND column_name = 'in_out_theoretical_qty'
  ) THEN
    ALTER TABLE public.inventory_count_verifications
      RENAME COLUMN in_out_theoretical_qty TO system_stock_qty;
  END IF;
END $$;

COMMENT ON COLUMN public.inventory_count_verifications.system_stock_qty IS
  'Stock in inventory_items at count time, before the count update is applied';
