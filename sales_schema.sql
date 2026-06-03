-- Sales Management System Schema
-- Created for BLACKANDBREW Sales Analysis

-- 1. Sales Uploads Table - Tracks each Excel file upload
CREATE TABLE IF NOT EXISTS sales_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  total_records INTEGER,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  analysis_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sales Records Table - Individual sales transaction records
CREATE TABLE IF NOT EXISTS sales_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID REFERENCES sales_uploads(id) ON DELETE CASCADE,
  sale_date DATE,
  product_name TEXT,
  category TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  total_amount NUMERIC,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE sales_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (permissive for initial use)
CREATE POLICY "Public access for sales_uploads"
ON sales_uploads FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Public access for sales_records"
ON sales_records FOR ALL
USING (true)
WITH CHECK (true);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_uploads_date ON sales_uploads(upload_date);
CREATE INDEX IF NOT EXISTS idx_sales_records_upload ON sales_records(upload_id);
CREATE INDEX IF NOT EXISTS idx_sales_records_date ON sales_records(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_records_category ON sales_records(category);
