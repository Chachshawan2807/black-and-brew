-- Harden branch withdrawal RPC: actor attribution, empty-batch guard, least-privilege execute

DROP FUNCTION IF EXISTS public.record_branch_withdrawal_batch(text, jsonb);

CREATE OR REPLACE FUNCTION public.record_branch_withdrawal_batch(
  p_line_message text,
  p_lines jsonb,
  p_created_by uuid DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_withdrawal_id uuid;
  v_line jsonb;
  v_item_id uuid;
  v_quantity numeric;
  v_current_stock numeric;
  v_new_stock numeric;
  v_note text;
  v_line_count integer;
BEGIN
  IF p_line_message IS NULL OR btrim(p_line_message) = '' THEN
    RAISE EXCEPTION 'line_message is required';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' THEN
    RAISE EXCEPTION 'p_lines must be a JSON array';
  END IF;

  v_line_count := jsonb_array_length(p_lines);

  IF v_line_count = 0 THEN
    RAISE EXCEPTION 'p_lines must contain at least one line';
  END IF;

  INSERT INTO public.inventory_branch_withdrawals (
    line_message,
    line_count,
    created_by
  )
  VALUES (
    p_line_message,
    v_line_count,
    COALESCE(p_created_by, auth.uid())
  )
  RETURNING id INTO v_withdrawal_id;

  v_note := format('[branch2-withdraw:%s]', v_withdrawal_id);

  FOR v_line IN
    SELECT value
    FROM jsonb_array_elements(p_lines) AS t(value)
  LOOP
    v_item_id := NULLIF(v_line->>'item_id', '')::uuid;
    v_quantity := NULLIF(v_line->>'quantity', '')::numeric;

    IF v_item_id IS NULL THEN
      RAISE EXCEPTION 'Each line must include item_id';
    END IF;

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for item %', v_item_id;
    END IF;

    SELECT COALESCE(stock, 0)
    INTO v_current_stock
    FROM public.inventory_items
    WHERE id = v_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found (ID: %)', v_item_id;
    END IF;

    v_new_stock := v_current_stock + v_quantity;

    UPDATE public.inventory_items
    SET stock = v_new_stock
    WHERE id = v_item_id;

    INSERT INTO public.inventory_transactions (
      inventory_item_id,
      type,
      quantity,
      note,
      balance_after
    )
    VALUES (
      v_item_id,
      'IN',
      v_quantity,
      v_note,
      v_new_stock
    );
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'withdrawal_id', v_withdrawal_id,
    'line_message', p_line_message
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_branch_withdrawal_batch(text, jsonb, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_branch_withdrawal_batch(text, jsonb, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.record_branch_withdrawal_batch(text, jsonb, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_branch_withdrawal_batch(text, jsonb, uuid) TO service_role;
