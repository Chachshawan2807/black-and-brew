-- Regular Holidays Persistence
-- Stores each employee's recurring weekly day off in Supabase.

CREATE TABLE IF NOT EXISTS regular_holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT regular_holidays_profile_day_unique UNIQUE (profile_id, day_of_week)
);

ALTER TABLE regular_holidays ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'regular_holidays'
      AND policyname = 'Authenticated access for regular_holidays'
  ) THEN
    CREATE POLICY "Authenticated access for regular_holidays"
    ON regular_holidays FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_regular_holidays_profile ON regular_holidays (profile_id);
