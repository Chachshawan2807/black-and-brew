-- Remove database tables owned by the retired Market Insights feature.
-- Safe to run on environments where the optional tables were never created.

DROP TABLE IF EXISTS public.market_insight_runs CASCADE;
DROP TABLE IF EXISTS public.local_events CASCADE;
