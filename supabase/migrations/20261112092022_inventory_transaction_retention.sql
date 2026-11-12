-- Retention purge for inventory_transactions: IN / OUT / ADJUST older than retention window.
CREATE OR REPLACE FUNCTION public.purge_inventory_transactions_batch(
  p_retention_months integer DEFAULT 6,
  p_batch_size integer DEFAULT 500
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
  cutoff timestamptz;
BEGIN
  IF p_retention_months < 1 THEN
    RAISE EXCEPTION 'p_retention_months must be >= 1';
  END IF;

  IF p_batch_size < 1 THEN
    RAISE EXCEPTION 'p_batch_size must be >= 1';
  END IF;

  cutoff :=
    ((now() AT TIME ZONE 'Asia/Bangkok') - make_interval(months => p_retention_months))
    AT TIME ZONE 'Asia/Bangkok';

  WITH candidates AS (
    SELECT id
    FROM public.inventory_transactions
    WHERE type IN ('IN', 'OUT', 'ADJUST')
      AND transaction_at < cutoff
    ORDER BY transaction_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  ),
  removed AS (
    DELETE FROM public.inventory_transactions
    WHERE id IN (SELECT id FROM candidates)
    RETURNING id
  )
  SELECT count(*)::integer INTO deleted_count FROM removed;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.purge_inventory_transactions_batch(integer, integer) IS
  'Delete aged IN/OUT/ADJUST inventory ledger rows past retention (Bangkok calendar months).';

REVOKE ALL ON FUNCTION public.purge_inventory_transactions_batch(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_inventory_transactions_batch(integer, integer) TO service_role;
