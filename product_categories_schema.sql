-- Product Categories Management Schema
-- Created for BLACKANDBREW Sales Analysis

-- 1. Product Categories Table - Stores product to category mappings
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  is_ai_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT product_categories_product_name_key UNIQUE (product_name)
);

-- Enable Row Level Security (RLS)
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (drop if exists first to avoid errors)
DROP POLICY IF EXISTS "Public access for product_categories" ON product_categories;
CREATE POLICY "Public access for product_categories"
ON product_categories FOR ALL
USING (true)
WITH CHECK (true);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories(product_name);
CREATE INDEX IF NOT EXISTS idx_product_categories_category ON product_categories(category);
