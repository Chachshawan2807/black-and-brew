-- Allow Realtime + catch-up reads for cron daily schedule report logs in the notification panel.

DROP POLICY IF EXISTS "anon_read_schedule_daily_report_logs" ON public.data_change_logs;

CREATE POLICY "anon_read_schedule_daily_report_logs"
  ON public.data_change_logs FOR SELECT
  TO anon, authenticated
  USING (
    module = 'schedule'
    AND entity_type = 'daily_report'
    AND metadata->>'kind' = 'daily_report'
  );
