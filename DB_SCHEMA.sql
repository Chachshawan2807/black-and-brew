-- 1. Profiles Table (Initial 9 Employees)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Shifts Table (Supports Swappable Roles)
CREATE TABLE shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'swapped', 'cancelled', 'on_leave')),
  metadata JSONB DEFAULT '{}', -- For AI Agent Context
  created_by UUID REFERENCES profiles(id)
);

-- 3. Row Level Security (RLS) - Permissive for initial phase
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read and write (As requested for initial group)
CREATE POLICY "Public access for initial group" 
ON profiles FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Public access for initial shifts" 
ON shifts FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. Optimized Indexes
CREATE INDEX idx_shifts_time_range ON shifts (start_time, end_time);
CREATE INDEX idx_employee_shifts ON shifts (employee_id);
