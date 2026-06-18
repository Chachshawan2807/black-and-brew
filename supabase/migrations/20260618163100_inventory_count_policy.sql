-- Inventory count policy: exact count vs sufficiency check.
-- Sufficiency-check items use manual order_qty and are excluded from accuracy scoring.

-- Reset old accuracy rows because scoring rules now exclude sufficiency-check items.
DELETE FROM public.inventory_count_verifications;

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS count_policy TEXT NOT NULL DEFAULT 'exact_count';

ALTER TABLE public.inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_count_policy_check;

ALTER TABLE public.inventory_items
  ADD CONSTRAINT inventory_items_count_policy_check
  CHECK (count_policy IN ('exact_count', 'sufficiency_check'));

CREATE INDEX IF NOT EXISTS idx_inventory_items_count_policy
  ON public.inventory_items(count_policy);

COMMENT ON COLUMN public.inventory_items.count_policy IS
  'Stock-taking method: exact_count is counted and included in accuracy; sufficiency_check is checked for enough/not enough, excluded from accuracy, and uses manual order_qty.';
