-- Enable in-app inventory notifications via Realtime on data_change_logs

CREATE INDEX IF NOT EXISTS idx_data_change_logs_module_occurred
  ON public.data_change_logs (module, occurred_at DESC);

CREATE POLICY "anon_read_inventory_change_logs"
  ON public.data_change_logs FOR SELECT
  TO anon, authenticated
  USING (module = 'inventory');

ALTER PUBLICATION supabase_realtime ADD TABLE public.data_change_logs;
