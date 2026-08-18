-- Reset inventory IN/OUT/ADJUST ledger and related accuracy/branch history
-- before major stock adjustment. Preserves inventory_items (names, stock levels, etc.).

DELETE FROM public.inventory_transactions
WHERE type IN ('IN', 'OUT', 'ADJUST');

DELETE FROM public.inventory_count_verifications;
DELETE FROM public.inventory_branch_withdrawals;
