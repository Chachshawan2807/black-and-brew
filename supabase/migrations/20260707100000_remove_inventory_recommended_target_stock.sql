-- Remove inventory target stock recommendation settings (shortage_risk, lead_time_days)

ALTER TABLE public.inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_shortage_risk_check;

ALTER TABLE public.inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_lead_time_days_check;

ALTER TABLE public.inventory_items
  DROP COLUMN IF EXISTS shortage_risk,
  DROP COLUMN IF EXISTS lead_time_days;
