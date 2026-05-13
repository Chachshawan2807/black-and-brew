-- 1. Create the inventory_transactions table
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    type VARCHAR(10) CHECK (type IN ('IN', 'OUT')),
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    note TEXT,
    balance_after NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON public.inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON public.inventory_transactions(created_at DESC);

-- 3. Create Atomic Transaction RPC function (Zero-Guard & Race-Condition Safe)
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

  -- Record the transaction history
  INSERT INTO public.inventory_transactions (product_id, type, quantity, note, balance_after)
  VALUES (p_product_id, p_type, p_quantity, p_note, v_new_stock);

  v_result := json_build_object(
    'success', true,
    'new_stock', v_new_stock,
    'balance_after', v_new_stock
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
