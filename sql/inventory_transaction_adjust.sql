-- =============================================================================
-- Inventory history: ADJUST type + optional skip for stock-taking
-- Run in Supabase SQL Editor
-- =============================================================================

-- 1. Allow ADJUST transaction type (stock set / warehouse edit)
ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_type_check;

ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT inventory_transactions_type_check
  CHECK (type IN ('IN', 'OUT', 'ADJUST'));

-- 2. set_inventory_stock: record ADJUST (not faux IN/OUT), optional skip for count page
CREATE OR REPLACE FUNCTION public.set_inventory_stock(
  p_item_id UUID,
  p_new_stock NUMERIC,
  p_note TEXT DEFAULT 'Stock adjustment',
  p_record_history BOOLEAN DEFAULT TRUE
) RETURNS json AS $$
DECLARE
  v_old_stock NUMERIC;
  v_result json;
BEGIN
  IF p_new_stock < 0 THEN
    RAISE EXCEPTION 'Stock cannot be negative. Requested: %', p_new_stock;
  END IF;

  SELECT COALESCE(stock, 0) INTO v_old_stock
  FROM public.inventory_items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found (ID: %)', p_item_id;
  END IF;

  UPDATE public.inventory_items
  SET stock = p_new_stock,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_item_id;

  IF p_record_history AND v_old_stock IS DISTINCT FROM p_new_stock THEN
    INSERT INTO public.inventory_transactions (
      inventory_item_id,
      type,
      quantity,
      note,
      balance_after
    )
    VALUES (
      p_item_id,
      'ADJUST',
      ABS(p_new_stock - v_old_stock),
      p_note,
      p_new_stock
    );
  END IF;

  v_result := json_build_object(
    'success', true,
    'old_stock', v_old_stock,
    'new_stock', p_new_stock
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
