-- Login audit trail (ISO 27001 / NIST SP 800-63B aligned session events)
CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (
    event_type IN ('login_success', 'login_failure', 'logout', 'lockout')
  ),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT NOT NULL DEFAULT 'unknown' CHECK (
    device_type IN ('mobile', 'tablet', 'desktop', 'unknown')
  ),
  device_vendor TEXT,
  device_model TEXT,
  os_name TEXT,
  os_version TEXT,
  browser_name TEXT,
  browser_version TEXT,
  access_level TEXT CHECK (access_level IN ('full', 'read_only')),
  status TEXT NOT NULL DEFAULT 'success' CHECK (
    status IN ('success', 'failure', 'blocked')
  ),
  failure_reason TEXT,
  session_fingerprint TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_history_occurred_at
  ON public.login_history (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_history_event_type
  ON public.login_history (event_type);

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.login_history IS
  'Immutable authentication event log with device fingerprinting for security auditing.';
