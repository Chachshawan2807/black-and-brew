-- Trusted-device passkeys (WebAuthn) for biometric login on PWA
CREATE TABLE IF NOT EXISTS public.device_passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] NOT NULL DEFAULT '{}',
  device_label TEXT,
  session_fingerprint TEXT NOT NULL,
  access_level TEXT NOT NULL DEFAULT 'full' CHECK (access_level IN ('full', 'read_only')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_device_passkeys_session_fingerprint
  ON public.device_passkeys (session_fingerprint);

CREATE INDEX IF NOT EXISTS idx_device_passkeys_last_used_at
  ON public.device_passkeys (last_used_at DESC);

ALTER TABLE public.device_passkeys ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.device_passkeys IS
  'WebAuthn credentials for trusted-device biometric login; server-only via service role.';
