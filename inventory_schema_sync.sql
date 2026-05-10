-- PHASE 1: SQL SCHEMA SYNCHRONIZATION
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  stock NUMERIC DEFAULT 0,
  order_qty NUMERIC DEFAULT 0,
  order_point NUMERIC DEFAULT 0,
  target_stock NUMERIC DEFAULT 0,
  unit TEXT NOT NULL,
  source TEXT,
  sort_order INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read and write for testing
CREATE POLICY "Public access for inventory_items" 
ON inventory_items FOR ALL 
USING (true) 
WITH CHECK (true);
