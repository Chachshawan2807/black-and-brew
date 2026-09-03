-- Remove learned duration stats table (AI capacity planning retired)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'operational_task_duration_stats'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.operational_task_duration_stats;
  END IF;
END $$;

DROP TABLE IF EXISTS public.operational_task_duration_stats;
