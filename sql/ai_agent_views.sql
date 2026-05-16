-- ============================================================
-- BLACKANDBREW AI AGENT — Read-Only Data Views & RPC
-- Risk Level: R2 | Run manually in Supabase SQL Editor
-- Purpose: Provide safe, aggregated data access for AI Agent
-- Security: READ-ONLY views only. No INSERT/UPDATE/DELETE.
-- ============================================================

-- VIEW 1: สรุปสต็อกคงเหลือปัจจุบัน (Current Stock Summary)
CREATE OR REPLACE VIEW ai_inventory_summary AS
SELECT
  name,
  stock,
  order_qty,
  order_point,
  target_stock,
  unit,
  source,
  CASE
    WHEN stock <= order_point THEN 'ต่ำกว่าจุดสั่งซื้อ'
    WHEN stock <= (order_point * 1.5) THEN 'ใกล้ถึงจุดสั่งซื้อ'
    ELSE 'ปกติ'
  END AS stock_status
FROM inventory_items
ORDER BY stock_status ASC, name ASC;

-- VIEW 2: รายการสั่งซื้อที่ต้องดำเนินการ (Purchase Orders Needed)
CREATE OR REPLACE VIEW ai_purchase_orders_needed AS
SELECT
  name,
  stock AS current_stock,
  target_stock,
  (target_stock - stock) AS qty_to_order,
  unit,
  source
FROM inventory_items
WHERE stock <= order_point AND order_qty > 0
ORDER BY (target_stock - stock) DESC;

-- VIEW 3: สรุปตารางงานวันนี้ (Today's Shift Summary)
CREATE OR REPLACE VIEW ai_today_shifts AS
SELECT
  p.full_name,
  s.start_time AT TIME ZONE 'Asia/Bangkok' AS start_time_local,
  s.end_time AT TIME ZONE 'Asia/Bangkok' AS end_time_local,
  s.status
FROM shifts s
JOIN profiles p ON s.employee_id = p.id
WHERE DATE(s.start_time AT TIME ZONE 'Asia/Bangkok') = CURRENT_DATE
ORDER BY s.start_time ASC;

-- VIEW 4: ประวัติ transactions 7 วันล่าสุด (Recent Transactions)
CREATE OR REPLACE VIEW ai_recent_transactions AS
SELECT
  ii.name AS item_name,
  it.type,
  it.quantity,
  it.note,
  it.balance_after,
  it.created_at AT TIME ZONE 'Asia/Bangkok' AS created_at_local
FROM inventory_transactions it
JOIN inventory_items ii ON it.inventory_item_id = ii.id
WHERE it.created_at >= NOW() - INTERVAL '7 days'
ORDER BY it.created_at DESC
LIMIT 50;

-- ============================================================
-- RPC FUNCTIONS (Called by AI Agent via Server Action)
-- ============================================================

-- RPC 1: get_inventory_summary
CREATE OR REPLACE FUNCTION get_inventory_summary()
RETURNS TABLE (
  name TEXT,
  stock NUMERIC,
  order_point NUMERIC,
  target_stock NUMERIC,
  unit TEXT,
  stock_status TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT name, stock, order_point, target_stock, unit, stock_status
  FROM ai_inventory_summary;
$$;

-- RPC 2: get_today_schedule
CREATE OR REPLACE FUNCTION get_today_schedule()
RETURNS TABLE (
  full_name TEXT,
  start_time_local TIMESTAMPTZ,
  end_time_local TIMESTAMPTZ,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT full_name, start_time_local, end_time_local, status
  FROM ai_today_shifts;
$$;

-- RPC 3: get_low_stock_items
CREATE OR REPLACE FUNCTION get_low_stock_items()
RETURNS TABLE (
  name TEXT,
  current_stock NUMERIC,
  qty_to_order NUMERIC,
  unit TEXT,
  source TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT name, current_stock, qty_to_order, unit, source
  FROM ai_purchase_orders_needed;
$$;

-- ============================================================
-- GRANT READ-ONLY access to authenticated users
-- (Views are already restricted — no DML permissions granted)
-- ============================================================
GRANT SELECT ON ai_inventory_summary TO authenticated;
GRANT SELECT ON ai_purchase_orders_needed TO authenticated;
GRANT SELECT ON ai_today_shifts TO authenticated;
GRANT SELECT ON ai_recent_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_today_schedule() TO authenticated;
GRANT EXECUTE ON FUNCTION get_low_stock_items() TO authenticated;
