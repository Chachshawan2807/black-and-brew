-- PHASE 1: DYNAMIC COLUMN ALIASING SCHEMA
-- Creates inventory_config table

CREATE TABLE IF NOT EXISTS inventory_config (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial column configuration seed
INSERT INTO inventory_config (id, settings)
VALUES (
  'column_labels',
  '{
    "order": ["name", "stock", "order_qty", "order_point", "target_stock", "unit", "source"],
    "labels": {
      "name": "ชื่อรายการ",
      "stock": "คงเหลือ",
      "order_qty": "จำนวนสั่งซื้อ",
      "order_point": "จุดสั่งซื้อ",
      "target_stock": "จำนวนที่ต้องมี",
      "unit": "หน่วย",
      "source": "ช่องทางสั่งซื้อ"
    }
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE inventory_config ENABLE ROW LEVEL SECURITY;

-- Authenticated collaborative access after PIN gate anonymous sign-in
CREATE POLICY "Authenticated access for inventory_config"
ON inventory_config FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
