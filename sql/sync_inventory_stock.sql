-- =============================================================================
-- Inventory Stock Sync — Single Source of Truth
-- Run this script in Supabase SQL Editor
-- =============================================================================

-- 1. Ensure realtime broadcasts full row on UPDATE (required for multi-window sync)
ALTER TABLE public.inventory_items REPLICA IDENTITY FULL;

-- 2. Atomic stock SET function (stock-taking + direct warehouse edits)
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

  -- Record ADJUST in ledger when quantity changed (skip for stock-taking count page)
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
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public;

-- 3. Keep order_qty in sync with computed formula (DEC-005)
--    IF stock <= order_point THEN order_qty = target_stock - stock ELSE 0
CREATE OR REPLACE FUNCTION public.sync_inventory_order_qty()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  IF NEW.stock <= COALESCE(NEW.order_point, 0) AND COALESCE(NEW.target_stock, 0) > NEW.stock THEN
    NEW.order_qty := GREATEST(0, COALESCE(NEW.target_stock, 0) - NEW.stock);
  ELSE
    NEW.order_qty := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inventory_order_qty ON public.inventory_items;

CREATE TRIGGER trg_sync_inventory_order_qty
  BEFORE INSERT OR UPDATE OF stock, order_point, target_stock
  ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_inventory_order_qty();

-- 4. Backfill order_qty for existing rows
UPDATE public.inventory_items
SET order_qty = CASE
  WHEN stock <= COALESCE(order_point, 0) AND COALESCE(target_stock, 0) > stock
    THEN GREATEST(0, COALESCE(target_stock, 0) - stock)
  ELSE 0
END;

-- 5. Enable realtime (safe to run if already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'inventory_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
  END IF;
END $$;
