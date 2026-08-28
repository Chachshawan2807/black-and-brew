-- Remove learned duration stats table (AI capacity planning retired)

ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.operational_task_duration_stats;

DROP TABLE IF EXISTS public.operational_task_duration_stats;
