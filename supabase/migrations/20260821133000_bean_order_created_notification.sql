-- Allow catch-up reads for bean order created notification logs.

DROP POLICY IF EXISTS "anon_read_bean_order_notification_logs" ON public.data_change_logs;

CREATE POLICY "anon_read_bean_order_notification_logs"
  ON public.data_change_logs FOR SELECT
  TO anon, authenticated
  USING (
    module = 'bean_orders'
    AND metadata->>'kind' IN (
      'bean_order_created',
      'bean_order_delivered',
      'bean_order_shipped',
      'bean_order_payment_confirmed'
    )
  );
