-- Retention purge for data_change_logs: delete rows older than retention window
-- while preserving active dedup notification rows.
CREATE OR REPLACE FUNCTION public.purge_data_change_logs_batch(
  p_retention_days integer DEFAULT 90,
  p_batch_size integer DEFAULT 1000
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF p_retention_days < 1 THEN
    RAISE EXCEPTION 'p_retention_days must be >= 1';
  END IF;

  IF p_batch_size < 1 THEN
    RAISE EXCEPTION 'p_batch_size must be >= 1';
  END IF;

  WITH candidates AS (
    SELECT id
    FROM public.data_change_logs
    WHERE occurred_at < (now() - make_interval(days => p_retention_days))
      AND NOT (
        (module = 'insights' AND occurred_at >= (now() - interval '7 days'))
        OR (
          module = 'schedule'
          AND entity_type = 'daily_report'
          AND occurred_at >= (now() - interval '3 days')
        )
        OR (
          module = 'bean_orders'
          AND entity_type IN (
            'bean_order_created',
            'bean_order_delivery',
            'bean_order_shipment',
            'bean_order_payment'
          )
          AND occurred_at >= (now() - interval '30 days')
        )
        OR (module = 'security' AND occurred_at >= (now() - interval '2 days'))
        OR (
          module = 'secretary'
          AND entity_type = 'secretary_digest'
          AND occurred_at >= (now() - interval '7 days')
        )
      )
    ORDER BY occurred_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  ),
  removed AS (
    DELETE FROM public.data_change_logs
    WHERE id IN (SELECT id FROM candidates)
    RETURNING id
  )
  SELECT count(*)::integer INTO deleted_count FROM removed;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.purge_data_change_logs_batch(integer, integer) IS
  'Delete aged data_change_logs past retention while preserving active dedup notification rows.';

REVOKE ALL ON FUNCTION public.purge_data_change_logs_batch(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_data_change_logs_batch(integer, integer) TO service_role;
