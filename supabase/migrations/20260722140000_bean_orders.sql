-- Coffee bean customer orders (staff-facing sales module)

-- Customers
CREATE TABLE IF NOT EXISTS public.bean_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_bean_customers_name ON public.bean_customers (name);
CREATE INDEX IF NOT EXISTS idx_bean_customers_phone ON public.bean_customers (phone);

-- Customer saved addresses
CREATE TABLE IF NOT EXISTS public.bean_customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.bean_customers(id) ON DELETE CASCADE,
  label text,
  recipient_name text NOT NULL,
  recipient_phone text,
  address_line text NOT NULL,
  province text,
  postal_code text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_bean_customer_addresses_customer
  ON public.bean_customer_addresses (customer_id);

-- Orders
CREATE TABLE IF NOT EXISTS public.bean_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.bean_customers(id) ON DELETE SET NULL,
  sender_name text,
  sender_phone text,
  sender_address text,
  recipient_name text NOT NULL,
  recipient_phone text,
  recipient_address text NOT NULL,
  recipient_province text,
  recipient_postal_code text,
  subtotal_baht numeric NOT NULL DEFAULT 0,
  discount_baht numeric NOT NULL DEFAULT 0,
  shipping_baht numeric NOT NULL DEFAULT 0,
  total_baht numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid')),
  fulfillment_status text NOT NULL DEFAULT 'pending'
    CHECK (fulfillment_status IN ('pending', 'shipped')),
  status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  cancelled_at timestamptz,
  cancelled_by text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_bean_orders_created_at ON public.bean_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bean_orders_payment_status ON public.bean_orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_bean_orders_fulfillment_status ON public.bean_orders (fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_bean_orders_order_no ON public.bean_orders (order_no);

-- Order line items
CREATE TABLE IF NOT EXISTS public.bean_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.bean_orders(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  weight_value numeric NOT NULL CHECK (weight_value > 0),
  weight_unit text NOT NULL CHECK (weight_unit IN ('g', 'kg')),
  unit_price_per_kg numeric NOT NULL CHECK (unit_price_per_kg >= 0),
  line_total_baht numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_bean_order_lines_order ON public.bean_order_lines (order_id);

-- Payment slips
CREATE TABLE IF NOT EXISTS public.bean_order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.bean_orders(id) ON DELETE CASCADE,
  slip_url text NOT NULL,
  uploaded_by text,
  uploaded_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  confirmed_by text,
  confirmed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_bean_order_payments_order ON public.bean_order_payments (order_id);

-- Shipments & tracking
CREATE TABLE IF NOT EXISTS public.bean_order_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.bean_orders(id) ON DELETE CASCADE,
  delivery_type text NOT NULL CHECK (delivery_type IN ('parcel', 'same_day')),
  carrier_code text,
  tracking_number text,
  tracking_status text,
  tracking_raw jsonb,
  shipped_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  shipped_by text
);

-- RLS: authenticated read; writes via service role in server actions
ALTER TABLE public.bean_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bean_customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bean_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bean_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bean_order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bean_order_shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bean_customers_select" ON public.bean_customers;
CREATE POLICY "bean_customers_select" ON public.bean_customers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bean_customer_addresses_select" ON public.bean_customer_addresses;
CREATE POLICY "bean_customer_addresses_select" ON public.bean_customer_addresses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bean_orders_select" ON public.bean_orders;
CREATE POLICY "bean_orders_select" ON public.bean_orders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bean_order_lines_select" ON public.bean_order_lines;
CREATE POLICY "bean_order_lines_select" ON public.bean_order_lines FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bean_order_payments_select" ON public.bean_order_payments;
CREATE POLICY "bean_order_payments_select" ON public.bean_order_payments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bean_order_shipments_select" ON public.bean_order_shipments;
CREATE POLICY "bean_order_shipments_select" ON public.bean_order_shipments FOR SELECT TO authenticated USING (true);

-- Storage bucket for payment slips
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bean-order-slips',
  'bean-order-slips',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "bean_order_slips_authenticated_read" ON storage.objects;
CREATE POLICY "bean_order_slips_authenticated_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bean-order-slips');

DROP POLICY IF EXISTS "bean_order_slips_authenticated_insert" ON storage.objects;
CREATE POLICY "bean_order_slips_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bean-order-slips');

COMMENT ON TABLE public.bean_orders IS
  'Staff-created coffee bean sales orders with dual-axis payment/fulfillment status.';
