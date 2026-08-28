-- Time tracking sessions and learned duration estimates for secretary tasks

ALTER TABLE public.operational_tasks
  ADD COLUMN IF NOT EXISTS active_session_started_at timestamptz;

CREATE TABLE IF NOT EXISTS public.operational_task_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.operational_tasks(id) ON DELETE CASCADE,
  task_type text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS operational_task_sessions_task_id_idx
  ON public.operational_task_sessions (task_id);

CREATE INDEX IF NOT EXISTS operational_task_sessions_task_type_idx
  ON public.operational_task_sessions (task_type, ended_at DESC);

CREATE TABLE IF NOT EXISTS public.operational_task_duration_stats (
  task_type text PRIMARY KEY,
  sample_count integer NOT NULL DEFAULT 0 CHECK (sample_count >= 0),
  avg_minutes numeric(8, 2) NOT NULL DEFAULT 30 CHECK (avg_minutes > 0),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.operational_task_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_task_duration_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read operational_task_sessions" ON public.operational_task_sessions;
CREATE POLICY "Allow authenticated read operational_task_sessions"
  ON public.operational_task_sessions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert operational_task_sessions" ON public.operational_task_sessions;
CREATE POLICY "Allow authenticated insert operational_task_sessions"
  ON public.operational_task_sessions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read operational_task_duration_stats" ON public.operational_task_duration_stats;
CREATE POLICY "Allow authenticated read operational_task_duration_stats"
  ON public.operational_task_duration_stats FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated upsert operational_task_duration_stats" ON public.operational_task_duration_stats;
CREATE POLICY "Allow authenticated upsert operational_task_duration_stats"
  ON public.operational_task_duration_stats FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update operational_task_duration_stats" ON public.operational_task_duration_stats;
CREATE POLICY "Allow authenticated update operational_task_duration_stats"
  ON public.operational_task_duration_stats FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'operational_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.operational_tasks;
  END IF;
END $$;
