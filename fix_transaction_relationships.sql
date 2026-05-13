-- 1. Rename column if it was product_id
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory_transactions' AND column_name='product_id') THEN
    ALTER TABLE public.inventory_transactions RENAME COLUMN product_id TO inventory_item_id;
  END IF;
END $$;

-- 2. Re-create Atomic Transaction RPC function with correct column names
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
  SELECT COALESCE(stock, 0) INTO v_current_stock FROM public.inventory_items WHERE id = p_product_id FOR UPDATE;
  
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
  UPDATE public.inventory_items SET stock = v_new_stock WHERE id = p_product_id;

  -- Record the transaction history (using the standardized inventory_item_id)
  INSERT INTO public.inventory_transactions (inventory_item_id, type, quantity, note, balance_after)
  VALUES (p_product_id, p_type, p_quantity, p_note, v_new_stock);

  v_result := json_build_object(
    'success', true,
    'new_stock', v_new_stock,
    'balance_after', v_new_stock
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
