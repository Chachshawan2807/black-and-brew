-- Extend existing push_subscriptions for daily schedule Web Push broadcasts.
-- (Project already uses push_subscriptions — not a separate web_push_subscriptions table.)

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_id text NOT NULL DEFAULT 'main';

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_branch_id
  ON public.push_subscriptions (branch_id);

UPDATE public.push_subscriptions ps
SET profile_id = ps.user_id
WHERE profile_id IS NULL
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ps.user_id);

COMMENT ON COLUMN public.push_subscriptions.profile_id IS
  'Staff profile linked to auth user — mirrors profiles.id when available.';
COMMENT ON COLUMN public.push_subscriptions.branch_id IS
  'Branch scope for broadcast filters; default main (single-store ERP).';
