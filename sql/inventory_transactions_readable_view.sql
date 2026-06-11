-- =============================================================================
-- Readable inventory transaction log (joins item name for Supabase dashboard)
-- Browse this VIEW in Table Editor; delete rows on inventory_transactions by id.
-- =============================================================================

CREATE OR REPLACE VIEW public.inventory_transactions_readable AS
SELECT
  t.id,
  t.created_at,
  i.name AS item_name,
  i.unit AS item_unit,
  t.type,
  t.quantity,
  t.balance_after,
  t.note,
  t.inventory_item_id
FROM public.inventory_transactions t
LEFT JOIN public.inventory_items i ON i.id = t.inventory_item_id
ORDER BY t.created_at DESC;

COMMENT ON VIEW public.inventory_transactions_readable IS
  'Ledger with item names for admin review. Deleting here does not change stock; delete from inventory_transactions by id if needed.';

GRANT SELECT ON public.inventory_transactions_readable TO authenticated;
GRANT SELECT ON public.inventory_transactions_readable TO service_role;
