-- Enable in-app inventory notifications via Realtime on data_change_logs

CREATE INDEX IF NOT EXISTS idx_data_change_logs_module_occurred
  ON public.data_change_logs (module, occurred_at DESC);

DROP POLICY IF EXISTS "anon_read_inventory_change_logs" ON public.data_change_logs;

CREATE POLICY "anon_read_inventory_change_logs"
  ON public.data_change_logs FOR SELECT
  TO anon, authenticated
  USING (module = 'inventory');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'data_change_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.data_change_logs;
  END IF;
END $$;
