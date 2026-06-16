-- Remote session revocation (force sign-out per device fingerprint)
-- รันครั้งเดียวด้วยมือ: scripts/apply-pending-migrations.sql (ส่วนท้ายไฟล์)
-- ไฟล์นี้ใช้กับ supabase db push / migration history เท่านั้น

-- Legacy remote schema used session_id; app expects session_fingerprint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'revoked_sessions'
      AND column_name = 'session_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'revoked_sessions'
      AND column_name = 'session_fingerprint'
  ) THEN
    ALTER TABLE public.revoked_sessions RENAME COLUMN session_id TO session_fingerprint;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.revoked_sessions (
  session_fingerprint TEXT PRIMARY KEY,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_revoked_sessions_revoked_at
  ON public.revoked_sessions (revoked_at DESC);

ALTER TABLE public.revoked_sessions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.revoked_sessions IS
  'Fingerprints of login sessions revoked remotely; checked on each auth validation.';
