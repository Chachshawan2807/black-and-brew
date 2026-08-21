-- Speed up filtered history tabs (IN / OUT / ADJUST) ordered by business date.
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type_transaction_at
  ON public.inventory_transactions (type, transaction_at DESC);
