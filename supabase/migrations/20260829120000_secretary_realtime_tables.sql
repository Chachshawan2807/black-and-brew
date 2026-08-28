-- Realtime publication for secretary board sync (inventory, schedule, bean orders, maintenance)

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'shifts',
    'inventory_items',
    'inventory_branch_withdrawals',
    'bean_orders',
    'bean_order_payments',
    'bean_order_shipments',
    'service_records',
    'operational_task_sessions',
    'operational_task_duration_stats'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;
