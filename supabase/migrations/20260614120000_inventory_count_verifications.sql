-- Inventory count verification ledger for IN/OUT recording accuracy

CREATE TABLE IF NOT EXISTS public.inventory_count_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL
    REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  counted_qty NUMERIC NOT NULL CHECK (counted_qty >= 0),
  in_out_theoretical_qty NUMERIC NOT NULL,
  matched BOOLEAN NOT NULL,
  counted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_count_verifications_item
  ON public.inventory_count_verifications(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_count_verifications_counted_at
  ON public.inventory_count_verifications(counted_at DESC);

ALTER TABLE public.inventory_count_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view count verifications"
  ON public.inventory_count_verifications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert count verifications"
  ON public.inventory_count_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
