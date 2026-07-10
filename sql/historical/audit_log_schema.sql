
-- Audit Log Schema for BLACKANDBREW
-- Tracks all changes to data for accountability

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL, -- 'upload', 'category_update', 'data_reconcile'
  entity_type TEXT NOT NULL, -- 'product', 'category', 'sale'
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  user_id TEXT,
  user_email TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  status TEXT DEFAULT 'completed' -- 'pending', 'completed', 'failed'
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "Public access for audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated access for audit_logs" ON audit_logs;
CREATE POLICY "Authenticated access for audit_logs"
ON audit_logs FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
