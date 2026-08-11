-- Harden RLS: remove unauthenticated write paths and lock server-only tables.
-- PIN auth is app-level; browser clients use Supabase anonymous sign-in (role: authenticated).
-- Service-role server actions bypass RLS and are unchanged.

-- ─── Server-only tables (client must never read/write) ───────────────────────
DROP POLICY IF EXISTS "Public access for audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Public access for sales_records" ON public.sales_records;
DROP POLICY IF EXISTS "Public access for sales_uploads" ON public.sales_uploads;

-- ─── Maintenance records: authenticated staff only ───────────────────────────
DROP POLICY IF EXISTS "Allow all access to service_records" ON public.service_records;
DROP POLICY IF EXISTS "Allow public insert" ON public.service_records;
DROP POLICY IF EXISTS "Allow public select" ON public.service_records;
DROP POLICY IF EXISTS "Allow public update" ON public.service_records;

CREATE POLICY "authenticated_read_service_records"
  ON public.service_records
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_service_records"
  ON public.service_records
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_update_service_records"
  ON public.service_records
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated_delete_service_records"
  ON public.service_records
  FOR DELETE
  TO authenticated
  USING (true);

-- ─── Holidays / regular holidays: authenticated only ─────────────────────────
DROP POLICY IF EXISTS "Enable ALL access for holidays" ON public.holidays;
DROP POLICY IF EXISTS "Public access for holidays" ON public.holidays;

CREATE POLICY "authenticated_read_holidays"
  ON public.holidays
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_manage_holidays"
  ON public.holidays
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for regular_holidays" ON public.regular_holidays;

CREATE POLICY "authenticated_read_regular_holidays"
  ON public.regular_holidays
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_manage_regular_holidays"
  ON public.regular_holidays
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── Schedule: remove anonymous write; keep public read for legacy SSR paths ─
DROP POLICY IF EXISTS "Enable ALL access for shifts" ON public.shifts;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.shifts;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.shifts;

DROP POLICY IF EXISTS "Enable ALL access for profiles" ON public.profiles;

-- ─── SECURITY DEFINER RPCs: service_role only ───────────────────────────────
REVOKE ALL ON FUNCTION public.get_ai_inventory_item_details(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_ai_store_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_inventory_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_low_stock_items() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_today_schedule() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_inventory_transaction(uuid, character varying, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_inventory_stock(uuid, numeric, text, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_ai_inventory_item_details(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ai_store_status() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_inventory_summary() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_low_stock_items() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_today_schedule() TO service_role;
GRANT EXECUTE ON FUNCTION public.record_inventory_transaction(uuid, character varying, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_inventory_stock(uuid, numeric, text, boolean) TO service_role;
