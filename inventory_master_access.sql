-- PHASE 3: DATABASE SECURITY (IDEMPOTENT SQL)
-- Ensure full public access for inventory_items to resolve potential saving errors

-- 1. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Public access for inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "Allow public full access" ON inventory_items;

-- 2. Ensure RLS is enabled
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- 3. Create idempotent, full-access policy
CREATE POLICY "Allow public full access" 
ON inventory_items FOR ALL 
USING (true) 
WITH CHECK (true);
