-- Normalize bean order numbers: BO-YYYYMMDD-001 -> BO-YYYYMMDD-1 (no leading zeros)

CREATE OR REPLACE FUNCTION public.normalize_bean_order_no(order_no text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN order_no ~ '^BO-\d{8}-\d+$' THEN
      regexp_replace(order_no, '^BO-(\d{8})-0*(\d+)$', 'BO-\1-\2')
    ELSE order_no
  END;
$$;

-- bean_orders.order_no is unique; update only rows that change
UPDATE public.bean_orders
SET order_no = public.normalize_bean_order_no(order_no)
WHERE order_no ~ '^BO-\d{8}-0\d'
  AND order_no IS DISTINCT FROM public.normalize_bean_order_no(order_no);

-- Audit / notification labels
UPDATE public.data_change_logs
SET entity_label = public.normalize_bean_order_no(entity_label)
WHERE entity_label ~ '^BO-\d{8}-0\d'
  AND entity_label IS DISTINCT FROM public.normalize_bean_order_no(entity_label);

UPDATE public.data_change_logs
SET old_value = regexp_replace(
      old_value::text,
      'BO-(\d{8})-0*(\d+)',
      'BO-\1-\2',
      'g'
    )::jsonb
WHERE old_value::text ~ 'BO-\d{8}-0\d';

UPDATE public.data_change_logs
SET new_value = regexp_replace(
      new_value::text,
      'BO-(\d{8})-0*(\d+)',
      'BO-\1-\2',
      'g'
    )::jsonb
WHERE new_value::text ~ 'BO-\d{8}-0\d';

UPDATE public.data_change_logs
SET metadata = regexp_replace(
      metadata::text,
      'BO-(\d{8})-0*(\d+)',
      'BO-\1-\2',
      'g'
    )::jsonb
WHERE metadata IS NOT NULL
  AND metadata::text ~ 'BO-\d{8}-0\d';

DROP FUNCTION public.normalize_bean_order_no(text);
