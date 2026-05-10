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

-- 5. Inventory Items (Core Inventory Tracking)
-- Re-activated from archived status as requested
CREATE TABLE inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  stock NUMERIC DEFAULT 0, -- คงเหลือ (Stock)
  order_qty NUMERIC DEFAULT 0, -- จำนวนสั่งซื้อ (Order Qty)
  order_point NUMERIC DEFAULT 0, -- จุดสั่งซื้อ (Reorder Point)
  target_stock NUMERIC DEFAULT 0, -- จำนวนที่ต้องมี (Target Qty)
  unit TEXT NOT NULL, -- หน่วย
  source TEXT, -- ช่องทางสั่งซื้อ (Source)
  sort_order INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for inventory_items
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access for inventory_items" 
ON inventory_items FOR ALL 
USING (true) 
WITH CHECK (true);

-- Indexes for inventory_items
CREATE INDEX idx_inventory_items_name ON inventory_items (name);
CREATE INDEX idx_inventory_items_sort ON inventory_items (sort_order);
