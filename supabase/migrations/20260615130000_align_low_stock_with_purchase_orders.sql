-- Align AI low-stock status with purchase-order modal (DEC-005):
-- stock <= order_point AND target_stock > stock

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
