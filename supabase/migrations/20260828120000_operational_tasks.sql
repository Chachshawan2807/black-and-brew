-- Personal secretary operational tasks

CREATE TABLE IF NOT EXISTS public.operational_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent', 'normal', 'low')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'skipped')),
  module text NOT NULL,
  due_at timestamptz,
  scheduled_date date NOT NULL DEFAULT (timezone('Asia/Bangkok', now()))::date,
  assignee_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  source_kind text NOT NULL DEFAULT 'derived' CHECK (source_kind IN ('derived', 'manual', 'ai_suggested')),
  source_ref jsonb,
  source_ref_hash text,
  action_href text,
  metadata jsonb,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  snoozed_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS operational_tasks_derived_hash_uidx
  ON public.operational_tasks (source_ref_hash)
  WHERE source_kind = 'derived' AND source_ref_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS operational_tasks_scheduled_status_idx
  ON public.operational_tasks (scheduled_date, status);

CREATE INDEX IF NOT EXISTS operational_tasks_module_idx
  ON public.operational_tasks (module);

ALTER TABLE public.operational_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read operational_tasks" ON public.operational_tasks;
CREATE POLICY "Allow authenticated read operational_tasks"
  ON public.operational_tasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert operational_tasks" ON public.operational_tasks;
CREATE POLICY "Allow authenticated insert operational_tasks"
  ON public.operational_tasks FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update operational_tasks" ON public.operational_tasks;
CREATE POLICY "Allow authenticated update operational_tasks"
  ON public.operational_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete manual operational_tasks" ON public.operational_tasks;
CREATE POLICY "Allow authenticated delete manual operational_tasks"
  ON public.operational_tasks FOR DELETE TO authenticated
  USING (source_kind = 'manual');
