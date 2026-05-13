-- Update RLS Policies for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove old restrictive policies (adjust names if they differ in your DB)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.profiles;

-- Create new policies for Authenticated All Access
CREATE POLICY "Allow authenticated users full access to profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);


-- Update RLS Policies for shifts table
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Remove old restrictive policies
DROP POLICY IF EXISTS "Users can view their own shifts." ON public.shifts;
DROP POLICY IF EXISTS "Users can insert their own shifts." ON public.shifts;
DROP POLICY IF EXISTS "Users can update their own shifts." ON public.shifts;
DROP POLICY IF EXISTS "Anyone can view shifts" ON public.shifts;
DROP POLICY IF EXISTS "Anyone can manage shifts" ON public.shifts;

-- Create new policies for Authenticated All Access
CREATE POLICY "Allow authenticated users full access to shifts"
ON public.shifts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
