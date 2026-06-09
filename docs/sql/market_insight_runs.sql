-- Market Insights v2 — run history (OPTIONAL)
--
-- The Market Insights feature works without this table (persistRun() fails
-- gracefully and logs a warning). Apply this migration to retain a history of
-- generated insights for trend review.
--
-- Apply via Supabase SQL editor or `supabase db push`.

create table if not exists public.market_insight_runs (
  id            uuid primary key default gen_random_uuid(),
  generated_at  timestamptz not null default now(),
  context_json  jsonb       not null,
  insights_json jsonb       not null,
  sources_json  jsonb       not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists market_insight_runs_generated_at_idx
  on public.market_insight_runs (generated_at desc);

-- This table is written only by server actions using the service-role key.
-- Enable RLS and add no public policies so the anon/auth roles cannot read it.
alter table public.market_insight_runs enable row level security;
