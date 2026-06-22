-- Inventory recommended target stock settings
-- Stores owner-controlled forecast settings per item without changing table layout.

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS shortage_risk TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER NOT NULL DEFAULT 3;

ALTER TABLE public.inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_shortage_risk_check;

ALTER TABLE public.inventory_items
  ADD CONSTRAINT inventory_items_shortage_risk_check
  CHECK (shortage_risk IN ('normal', 'medium', 'high'));

ALTER TABLE public.inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_lead_time_days_check;

ALTER TABLE public.inventory_items
  ADD CONSTRAINT inventory_items_lead_time_days_check
  CHECK (lead_time_days >= 0 AND lead_time_days <= 30);
