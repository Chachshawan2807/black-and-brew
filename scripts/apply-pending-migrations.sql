-- BLACKANDBREW: รันไฟล์นี้ไฟล์เดียวใน Supabase Dashboard → SQL Editor → New query → Run
-- Project: yghzklvtuykziqlexnzh
--
-- รวม migration ที่ค้างทั้งหมด (data_change_logs, inventory notifications,
-- inventory ADD/DELETE history, revoked_sessions)
-- login_history มีบน remote แล้ว — ไม่ต้องรันซ้ำ
--
-- ไม่ต้องรัน sql/revoked_sessions.sql หรือ migration แยก — อยู่ในไฟล์นี้แล้ว

-- === 20260612120000_create_data_change_logs.sql ===
CREATE TABLE IF NOT EXISTS public.data_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id TEXT,
  actor_label TEXT NOT NULL,
  actor_access_level TEXT CHECK (actor_access_level IN ('full', 'read_only', 'system')),
  action TEXT NOT NULL CHECK (
    action IN ('CREATE', 'UPDATE', 'DELETE', 'BULK_UPDATE', 'BULK_DELETE')
  ),
  module TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_label TEXT,
  field_changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  old_value JSONB,
  new_value JSONB,
  source TEXT NOT NULL DEFAULT 'web' CHECK (
    source IN ('web', 'server_action', 'api', 'system')
  ),
  ip_address TEXT,
  user_agent TEXT,
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

GRANT SELECT ON public.data_change_logs TO anon, authenticated;

COMMENT ON TABLE public.data_change_logs IS
  'Immutable append-only log of web-initiated data mutations with actor, field-level diffs, and request context.';

-- === 20260612130000_inventory_notifications.sql ===
CREATE INDEX IF NOT EXISTS idx_data_change_logs_module_occurred
  ON public.data_change_logs (module, occurred_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'data_change_logs'
      AND policyname = 'anon_read_inventory_change_logs'
  ) THEN
    CREATE POLICY "anon_read_inventory_change_logs"
      ON public.data_change_logs FOR SELECT
      TO anon, authenticated
      USING (module = 'inventory');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'data_change_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.data_change_logs;
  END IF;
END $$;

-- === 20260612140000_inventory_add_delete_history.sql ===
ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_type_check;

ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT inventory_transactions_type_check
  CHECK (type IN ('IN', 'OUT', 'ADJUST', 'ADD', 'DELETE'));

ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_quantity_check;

ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT inventory_transactions_quantity_check
  CHECK (quantity >= 0);

ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_inventory_item_id_fkey;

ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_product_id_fkey;

ALTER TABLE public.inventory_transactions
  ALTER COLUMN inventory_item_id DROP NOT NULL;

ALTER TABLE public.inventory_transactions
  ADD CONSTRAINT inventory_transactions_inventory_item_id_fkey
  FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE SET NULL;

-- === 20260612200000_revoked_sessions.sql ===
-- บังคับออกจากระบบอุปกรณ์อื่น (ตั้งค่า → ประวัติการเข้าสู่ระบบ)
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
