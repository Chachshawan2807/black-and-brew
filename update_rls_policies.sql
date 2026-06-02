-- ============================================================
-- MASTER RLS POLICIES SPEC v2026.1
-- ============================================================

-- [1] Update RLS Policies for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;

CREATE POLICY "Allow authenticated users to view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);


-- [2] Update RLS Policies for shifts table
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own shifts." ON public.shifts;
DROP POLICY IF EXISTS "Users can insert their own shifts." ON public.shifts;
DROP POLICY IF EXISTS "Users can update their own shifts." ON public.shifts;
DROP POLICY IF EXISTS "Anyone can view shifts" ON public.shifts;
DROP POLICY IF EXISTS "Anyone can manage shifts" ON public.shifts;

CREATE POLICY "Allow authenticated users to view shifts"
ON public.shifts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert or update shifts"
ON public.shifts
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update existing shifts"
ON public.shifts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);


-- [3] INVENTORY ITEMS SECURITY HARDENING
-- Rationale: "Treat AI Code as Untrusted" - Zero DELETE for Authenticated
-- ============================================================

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Anyone can manage inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow authenticated users to delete inventory" ON public.inventory_items;

-- SELECT: Allow staff to view stock levels
CREATE POLICY "Allow authenticated users to view inventory"
ON public.inventory_items
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Allow staff to add new items
CREATE POLICY "Allow authenticated users to insert inventory"
ON public.inventory_items
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Allow staff to update stock and details (onBlur sync)
CREATE POLICY "Allow authenticated users to update inventory"
ON public.inventory_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);