-- Allow Realtime + catch-up reads for proactive insight, bean order, and security logs.

DROP POLICY IF EXISTS "anon_read_insight_notification_logs" ON public.data_change_logs;

CREATE POLICY "anon_read_insight_notification_logs"
  ON public.data_change_logs FOR SELECT
  TO anon, authenticated
  USING (
    module = 'insights'
    AND entity_type = 'cross_module_insight'
    AND metadata->>'kind' = 'proactive_insight'
  );

DROP POLICY IF EXISTS "anon_read_bean_order_notification_logs" ON public.data_change_logs;

CREATE POLICY "anon_read_bean_order_notification_logs"
  ON public.data_change_logs FOR SELECT
  TO anon, authenticated
  USING (
    module = 'bean_orders'
    AND metadata->>'kind' IN (
      'bean_order_delivered',
      'bean_order_shipped',
      'bean_order_payment_confirmed'
    )
  );

DROP POLICY IF EXISTS "anon_read_security_notification_logs" ON public.data_change_logs;

CREATE POLICY "anon_read_security_notification_logs"
  ON public.data_change_logs FOR SELECT
  TO anon, authenticated
  USING (
    module = 'security'
    AND metadata->>'kind' = 'pin_lockout'
  );
