-- Inventory history: ADD / DELETE types + preserve ledger after item removal

ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_type_check;

ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT inventory_transactions_type_check
  CHECK (type IN ('IN', 'OUT', 'ADJUST', 'ADD', 'DELETE'));

ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_quantity_check;

ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT inventory_transactions_quantity_check
  CHECK (quantity >= 0);

ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_inventory_item_id_fkey;

ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_product_id_fkey;

ALTER TABLE public.inventory_transactions
  ALTER COLUMN inventory_item_id DROP NOT NULL;

ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT inventory_transactions_inventory_item_id_fkey
  FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE SET NULL;
