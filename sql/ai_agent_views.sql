-- AI Agent Support Views & RPCs
-- Created for "Brew" AI Assistant

-- 1. View for Today's Shifts Summary
CREATE OR REPLACE VIEW public.view_today_shifts AS
SELECT 
    s.id,
    p.full_name as employee_name,
    s.start_time,
    s.end_time,
    s.status,
    s.metadata
FROM public.shifts s
JOIN public.profiles p ON s.employee_id = p.id
WHERE s.start_time::date = CURRENT_DATE
   OR (s.start_time <= NOW() AND s.end_time >= NOW());

-- 2. View for Inventory Status Summary
CREATE OR REPLACE VIEW public.view_inventory_summary AS
SELECT 
    name,
    stock,
    unit,
    order_point,
    target_stock,
    CASE 
        WHEN stock <= order_point AND target_stock > stock THEN 'LOW'
        WHEN stock <= (order_point * 1.5) THEN 'WARNING'
        ELSE 'OK'
    END as status
FROM public.inventory_items
ORDER BY sort_order ASC;

-- 3. Readable AI inventory views used by Market Insights and generated DB types
CREATE OR REPLACE VIEW public.ai_inventory_summary AS
SELECT
    name,
    stock,
    unit,
    order_point,
    target_stock,
    source,
    order_qty,
    CASE
        WHEN stock <= order_point AND target_stock > stock THEN 'LOW'
        WHEN stock <= (order_point * 1.5) THEN 'WARNING'
        ELSE 'OK'
    END as stock_status
FROM public.inventory_items
ORDER BY sort_order ASC;

CREATE OR REPLACE VIEW public.ai_purchase_orders_needed AS
SELECT
    name,
    stock as current_stock,
    target_stock,
    GREATEST(target_stock - stock, 0) as qty_to_order,
    unit,
    source
FROM public.inventory_items
WHERE stock <= order_point
  AND target_stock > stock
ORDER BY sort_order ASC;

CREATE OR REPLACE VIEW public.ai_recent_transactions AS
SELECT
    ii.name as item_name,
    it.type,
    it.quantity,
    it.note,
    it.balance_after,
    timezone('Asia/Bangkok', it.created_at) as created_at_local
FROM public.inventory_transactions it
LEFT JOIN public.inventory_items ii ON ii.id = it.inventory_item_id
ORDER BY it.created_at DESC
LIMIT 50;

-- 4. RPC to get comprehensive store status for AI
CREATE OR REPLACE FUNCTION public.get_ai_store_status()
RETURNS json AS $$
DECLARE
    v_shifts json;
    v_inventory json;
    v_low_stock json;
BEGIN
    SELECT json_agg(t) INTO v_shifts FROM (SELECT * FROM public.view_today_shifts) t;
    SELECT json_agg(t) INTO v_inventory FROM (SELECT * FROM public.view_inventory_summary) t;
    SELECT json_agg(t) INTO v_low_stock FROM (SELECT * FROM public.view_inventory_summary WHERE status = 'LOW') t;

    RETURN json_build_object(
        'timestamp', NOW(),
        'shifts', COALESCE(v_shifts, '[]'::json),
        'inventory_summary', COALESCE(v_inventory, '[]'::json),
        'low_stock_items', COALESCE(v_low_stock, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC to get details of a specific inventory item by ID
CREATE OR REPLACE FUNCTION public.get_ai_inventory_item_details(item_id UUID)
RETURNS json AS $$
DECLARE
    v_item_details json;
BEGIN
    SELECT to_json(ii) INTO v_item_details
    FROM public.inventory_items ii
    WHERE ii.id = item_id;

    RETURN v_item_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
