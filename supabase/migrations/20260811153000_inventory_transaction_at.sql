-- Business date for IN/OUT ledger rows (separate from created_at audit timestamp).

ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS transaction_at TIMESTAMPTZ;

UPDATE public.inventory_transactions
SET transaction_at = created_at
WHERE transaction_at IS NULL;

ALTER TABLE public.inventory_transactions
  ALTER COLUMN transaction_at SET DEFAULT timezone('utc', now()),
  ALTER COLUMN transaction_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_transaction_at
  ON public.inventory_transactions (transaction_at DESC);

CREATE OR REPLACE FUNCTION public.record_inventory_transaction(
  p_product_id UUID,
  p_type VARCHAR,
  p_quantity NUMERIC,
  p_note TEXT,
  p_transaction_at TIMESTAMPTZ DEFAULT NULL
) RETURNS json AS $$
DECLARE
  v_current_stock NUMERIC;
  v_new_stock NUMERIC;
  v_tx_at TIMESTAMPTZ;
  v_result json;
BEGIN
  v_tx_at := COALESCE(p_transaction_at, timezone('utc', now()));

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

  UPDATE public.inventory_items
  SET stock = v_new_stock
  WHERE id = p_product_id;

  INSERT INTO public.inventory_transactions (
    inventory_item_id,
    type,
    quantity,
    note,
    balance_after,
    transaction_at
  )
  VALUES (
    p_product_id,
    p_type,
    p_quantity,
    p_note,
    v_new_stock,
    v_tx_at
  );

  v_result := json_build_object(
    'success', true,
    'old_stock', v_current_stock,
    'new_stock', v_new_stock,
    'balance_after', v_new_stock
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public;

REVOKE ALL ON FUNCTION public.record_inventory_transaction(uuid, character varying, numeric, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_inventory_transaction(uuid, character varying, numeric, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_inventory_transaction(uuid, character varying, numeric, text, timestamptz) TO service_role;
