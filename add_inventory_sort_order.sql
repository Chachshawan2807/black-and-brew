-- PHASE 1: SQL SCHEMA UPGRADE
-- Resolving "column sort_order does not exist" error

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS sort_order int4 DEFAULT 0;

-- Optional: If you want to auto-increment sort_order for existing rows, you could do something like this (but default 0 is fine for now):
-- WITH numbered AS (
--   SELECT id, row_number() over (order by created_at) as rn
--   FROM inventory_items
-- )
-- UPDATE inventory_items SET sort_order = numbered.rn FROM numbered WHERE inventory_items.id = numbered.id;
