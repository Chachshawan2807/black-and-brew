-- Data change audit trail (ISO 27001 / SOC 2 aligned — separate from login_history)
CREATE TABLE IF NOT EXISTS public.data_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- WHO
  actor_id TEXT,
  actor_label TEXT NOT NULL,
  actor_access_level TEXT CHECK (actor_access_level IN ('full', 'read_only', 'system')),

  -- WHAT
  action TEXT NOT NULL CHECK (
    action IN ('CREATE', 'UPDATE', 'DELETE', 'BULK_UPDATE', 'BULK_DELETE')
  ),
  module TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_label TEXT,

  -- CHANGE DETAIL
  field_changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  old_value JSONB,
  new_value JSONB,

  -- CONTEXT
  source TEXT NOT NULL DEFAULT 'web' CHECK (
    source IN ('web', 'server_action', 'api', 'system')
  ),
  ip_address TEXT,
  user_agent TEXT,

  -- RESULT
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  error_message TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_change_logs_occurred_at
  ON public.data_change_logs (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_change_logs_module
  ON public.data_change_logs (module);

CREATE INDEX IF NOT EXISTS idx_data_change_logs_entity_type
  ON public.data_change_logs (entity_type);

CREATE INDEX IF NOT EXISTS idx_data_change_logs_action
  ON public.data_change_logs (action);

ALTER TABLE public.data_change_logs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.data_change_logs IS
  'Immutable append-only log of web-initiated data mutations with actor, field-level diffs, and request context.';
