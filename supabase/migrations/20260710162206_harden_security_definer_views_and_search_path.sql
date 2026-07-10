-- Harden advisor findings:
-- 0010 security_definer_view  → security_invoker = true (Postgres 15+)
-- 0011 function_search_path_mutable → lock search_path on public RPCs/triggers

-- ─── Views: run with caller privileges so RLS on base tables applies ─────────
CREATE OR REPLACE VIEW public.view_today_shifts
WITH (security_invoker = true) AS
SELECT
  s.id,
  p.full_name AS employee_name,
  s.start_time,
  s.end_time,
  s.status,
  s.metadata
FROM public.shifts s
JOIN public.profiles p ON s.employee_id = p.id
WHERE s.start_time::date = CURRENT_DATE
   OR (s.start_time <= NOW() AND s.end_time >= NOW());

CREATE OR REPLACE VIEW public.view_inventory_summary
WITH (security_invoker = true) AS
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
  END AS status
FROM public.inventory_items
ORDER BY sort_order ASC;

-- ─── Functions: immutable search_path (blocks search_path hijacking) ─────────
ALTER FUNCTION public.set_inventory_stock(uuid, numeric, text, boolean)
  SET search_path TO public;

ALTER FUNCTION public.update_modified_column()
  SET search_path TO public;

ALTER FUNCTION public.get_low_stock_items()
  SET search_path TO public;

ALTER FUNCTION public.get_today_schedule()
  SET search_path TO public;

ALTER FUNCTION public.get_ai_store_status()
  SET search_path TO public;

ALTER FUNCTION public.get_ai_inventory_item_details(uuid)
  SET search_path TO public;

ALTER FUNCTION public.get_inventory_summary()
  SET search_path TO public;

ALTER FUNCTION public.record_inventory_transaction(uuid, character varying, numeric, text)
  SET search_path TO public;

ALTER FUNCTION public.sync_inventory_order_qty()
  SET search_path TO public;
