-- Local events that can affect nearby foot traffic and Market Insights AI analysis.

CREATE TABLE IF NOT EXISTS public.local_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  expected_impact TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_local_events_date
  ON public.local_events (date);

ALTER TABLE public.local_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view local events"
  ON public.local_events;

CREATE POLICY "Allow authenticated users to view local events"
  ON public.local_events
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage local events"
  ON public.local_events;

CREATE POLICY "Allow authenticated users to manage local events"
  ON public.local_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.local_events IS
  'Store-managed local events near the shop used as market context for AI recommendations.';

COMMENT ON COLUMN public.local_events.expected_impact IS
  'Short note about expected foot-traffic or demand impact, e.g. school event, market, road closure.';
