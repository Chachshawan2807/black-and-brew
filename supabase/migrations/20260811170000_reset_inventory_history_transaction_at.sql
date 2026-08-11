-- Reset inventory IN/OUT/ADJUST ledger and count accuracy history after transaction_at update.
-- Preserves inventory_items (names, stock levels, order points, etc.).

DELETE FROM public.inventory_transactions;
DELETE FROM public.inventory_count_verifications;
DELETE FROM public.inventory_branch_withdrawals;
