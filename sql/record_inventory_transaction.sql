-- =============================================================================
-- record_inventory_transaction — Atomic IN/OUT stock ledger RPC
-- =============================================================================
--
-- Purpose:
--   Atomically records a Quick Entry IN or OUT transaction:
--     1. Row-lock inventory_items (FOR UPDATE)
--     2. Validate stock (OUT cannot exceed current stock)
--     3. Update inventory_items.stock
--     4. Insert inventory_transactions ledger row
--
-- Parameters:
--   p_product_id  UUID    — inventory_items.id (legacy param name retained)
--   p_type        VARCHAR — 'IN' or 'OUT' only (ADD/DELETE/ADJUST use other paths)
--   p_quantity    NUMERIC — must be > 0
--   p_note        TEXT    — optional note stored on the ledger row
--
-- Returns (JSON):
--   { "success": true, "new_stock": <number>, "balance_after": <number> }
--
-- Security: SECURITY DEFINER — runs with function owner privileges.
--
-- Used by:
--   src/app/actions/inventory-actions.ts
--     - recordTransaction()
--     - recordBulkInventoryTransactions()
--
-- Schema dependencies:
--   inventory_items.stock
--   inventory_transactions.inventory_item_id (renamed from product_id)
--
-- Historical sources (archived — see supabase/migrations/ for schema changes):
--   setup_inventory_transactions.sql, fix_transaction_relationships.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION public.record_inventory_transaction(
  p_product_id UUID,
  p_type VARCHAR,
  p_quantity NUMERIC,
  p_note TEXT
) RETURNS json AS $$
DECLARE
  v_current_stock NUMERIC;
  v_new_stock NUMERIC;
  v_result json;
BEGIN
  -- Lock the row to prevent race conditions during concurrent updates
  SELECT COALESCE(stock, 0) INTO v_current_stock
  FROM public.inventory_items
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found (ID: %)', p_product_id;
  END IF;

  IF p_type = 'IN' THEN
    v_new_stock := v_current_stock + p_quantity;
  ELSIF p_type = 'OUT' THEN
    IF v_current_stock < p_quantity THEN
      RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', v_current_stock, p_quantity;
    END IF;
    v_new_stock := v_current_stock - p_quantity;
  ELSE
    RAISE EXCEPTION 'Invalid transaction type. Must be IN or OUT.';
  END IF;

  -- Update the inventory items table
  UPDATE public.inventory_items
  SET stock = v_new_stock
  WHERE id = p_product_id;

  -- Record the transaction history (inventory_item_id column)
  INSERT INTO public.inventory_transactions (
    inventory_item_id,
    type,
    quantity,
    note,
    balance_after
  )
  VALUES (
    p_product_id,
    p_type,
    p_quantity,
    p_note,
    v_new_stock
  );

  v_result := json_build_object(
    'success', true,
    'new_stock', v_new_stock,
    'balance_after', v_new_stock
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public;
