-- =============================================================================
-- Inventory RLS Hardening — v2026.2
-- Removes duplicate public/anon open policies; authenticated-only access.
-- Spec: update_rls_policies.sql + apply_rls_transactions.sql
-- Requires: client signs in via supabase.auth.signInAnonymously() after PIN gate.
-- =============================================================================

-- ── inventory_items ──────────────────────────────────────────────────────────
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow public full access" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow Public Delete Inventory Items" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow Public Insert Inventory Items" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow Public Select Inventory Items" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow Public Update Inventory Items" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow select on items" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow_Auth_Select_Items" ON public.inventory_items;
DROP POLICY IF EXISTS "Enable_Read_For_Authenticated" ON public.inventory_items;
DROP POLICY IF EXISTS "Anyone can manage inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow authenticated users to delete inventory" ON public.inventory_items;

DROP POLICY IF EXISTS "Allow authenticated users to view inventory" ON public.inventory_items;
CREATE POLICY "Allow authenticated users to view inventory"
  ON public.inventory_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert inventory" ON public.inventory_items;
CREATE POLICY "Allow authenticated users to insert inventory"
  ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update inventory" ON public.inventory_items;
CREATE POLICY "Allow authenticated users to update inventory"
  ON public.inventory_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ── inventory_config ─────────────────────────────────────────────────────────
ALTER TABLE public.inventory_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for inventory_config" ON public.inventory_config;
DROP POLICY IF EXISTS "Allow public full access" ON public.inventory_config;

DROP POLICY IF EXISTS "Allow authenticated users to view inventory config" ON public.inventory_config;
CREATE POLICY "Allow authenticated users to view inventory config"
  ON public.inventory_config FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage inventory config" ON public.inventory_config;
CREATE POLICY "Allow authenticated users to manage inventory config"
  ON public.inventory_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── inventory_transactions ───────────────────────────────────────────────────
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for all" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Full_Access_For_Authenticated_Users" ON public.inventory_transactions;

DROP POLICY IF EXISTS "Allow authenticated users to view all transactions" ON public.inventory_transactions;
CREATE POLICY "Allow authenticated users to view all transactions"
  ON public.inventory_transactions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert transactions" ON public.inventory_transactions;
CREATE POLICY "Allow authenticated users to insert transactions"
  ON public.inventory_transactions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete transactions" ON public.inventory_transactions;
CREATE POLICY "Allow authenticated users to delete transactions"
  ON public.inventory_transactions FOR DELETE TO authenticated USING (true);

-- ── product_categories (inventory-adjacent) ────────────────────────────────────
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for product_categories" ON public.product_categories;

DROP POLICY IF EXISTS "Allow authenticated users to view product categories" ON public.product_categories;
CREATE POLICY "Allow authenticated users to view product categories"
  ON public.product_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to manage product categories" ON public.product_categories;
CREATE POLICY "Allow authenticated users to manage product categories"
  ON public.product_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
