-- Remote session revocation (force sign-out per device fingerprint)
-- รันครั้งเดียวด้วยมือ: scripts/apply-pending-migrations.sql (ส่วนท้ายไฟล์)
-- ไฟล์นี้ใช้กับ supabase db push / migration history เท่านั้น
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
