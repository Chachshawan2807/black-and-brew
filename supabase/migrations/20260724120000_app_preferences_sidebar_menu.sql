-- Shared app preferences (branch-scoped) for cross-device UI sync

CREATE TABLE IF NOT EXISTS public.app_preferences (
  branch_id text PRIMARY KEY,
  sidebar_menu_order text[] NOT NULL DEFAULT '{}'::text[],
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_app_preferences"
  ON public.app_preferences
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.app_preferences IS
  'Branch-scoped UI preferences synced across devices (sidebar menu order, etc.).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'app_preferences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_preferences;
  END IF;
END $$;
