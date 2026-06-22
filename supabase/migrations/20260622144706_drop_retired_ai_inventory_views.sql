-- Remove retired AI-prefixed inventory helper views.
-- These views exposed staff-managed inventory and transaction history under confusing ai_* names.

DROP VIEW IF EXISTS public.ai_recent_transactions CASCADE;
DROP VIEW IF EXISTS public.ai_purchase_orders_needed CASCADE;
DROP VIEW IF EXISTS public.ai_inventory_summary CASCADE;
