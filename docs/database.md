# Database Schema ? BLACKANDBREW ERP

> Version: 8.3 | Last Updated: 2026-06-09 | Engine: Supabase PostgreSQL

---

## 1. Table Overview

| Table | Purpose | RLS | Source SQL |
| --- | --- | --- | --- |
| `profiles` | ????????????? 9 ?? | ? authenticated | `DB_SCHEMA.sql` |
| `shifts` | ?????????? | ? authenticated | `DB_SCHEMA.sql` |
| `inventory_items` | ?????????????????? | ? authenticated | `DB_SCHEMA.sql` + `fix_inventory_rls.sql` |
| `inventory_transactions` | ????????????????????????? | ? authenticated | `setup_inventory_transactions.sql` |
| `inventory_config` | ?????????????? Inventory UI | ? authenticated | `inventory_config_schema.sql` |
| `holidays` | ????????????? | ? | Created via `holiday-actions.ts` |
| `regular_holidays` | ?????????????????????? | ? | `regular_holidays_schema.sql` |
| `service_records` | ??????????????????????? | ? | Used by maintenance module |
| `sales_uploads` | ???? Excel ?????????? | ? | `sales_schema.sql` |
| `sales_records` | ???????????? | ? | `sales_schema.sql` |
| `product_categories` | ?????????????? | ? | `product_categories_schema.sql` |
| `audit_logs` | ?????? audit ?????? AI | ? | `audit_log_schema.sql` |

> **Types:** Generated types in `src/lib/database.types.ts`

---

## 2. Core Table Schemas

### `profiles`

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `shifts`

```sql
CREATE TABLE shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'swapped', 'cancelled', 'on_leave')),
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id)
);
```

### `inventory_items`

```sql
CREATE TABLE inventory_items (
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
```

### `inventory_transactions`

```sql
CREATE TABLE inventory_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  type VARCHAR(10) CHECK (type IN ('IN', 'OUT')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  note TEXT,
  balance_after NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);
```

> Column is `inventory_item_id` ? renamed from `product_id` via `fix_transaction_relationships.sql`

### `sales_uploads` / `sales_records`

```sql
CREATE TABLE sales_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  total_records INTEGER,
  status TEXT DEFAULT 'completed',
  analysis_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sales_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
```

### `market_insight_runs` (OPTIONAL)

```sql
CREATE TABLE IF NOT EXISTS public.market_insight_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context_json  JSONB       NOT NULL,
  insights_json JSONB       NOT NULL,
  sources_json  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

RLS enabled; no public policies ? written only by server actions using the service-role key.
Source: `docs/sql/market_insight_runs.sql`. Feature works without this table (`persistRun()` fails gracefully).

---

## 3. RLS Policies

### Current Standard (post `fix_inventory_rls.sql`)

- `inventory_items`, `inventory_config`: `authenticated` role ? SELECT/INSERT/UPDATE
- `inventory_transactions`: `authenticated` ? SELECT/INSERT/DELETE (no UPDATE ? ledger immutability)
- `profiles`, `shifts`: `authenticated` ? full CRUD
- Client must call `supabase.auth.signInAnonymously()` after PIN gate

### Legacy (pre-hardening)

```sql
-- Deprecated open policies ? removed by fix_inventory_rls.sql
CREATE POLICY "Public access for inventory_items" ON inventory_items FOR ALL USING (true);
```

---

## 4. Indexes

```sql
CREATE INDEX idx_shifts_time_range ON shifts (start_time, end_time);
CREATE INDEX idx_employee_shifts ON shifts (employee_id);
CREATE INDEX idx_inventory_items_name ON inventory_items (name);
CREATE INDEX idx_inventory_items_sort ON inventory_items (sort_order);
CREATE INDEX idx_inventory_transactions_product_id ON inventory_transactions(inventory_item_id);
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at DESC);
CREATE INDEX idx_sales_uploads_date ON sales_uploads(upload_date);
CREATE INDEX idx_sales_records_upload ON sales_records(upload_id);
CREATE INDEX idx_sales_records_date ON sales_records(sale_date);
```

---

## 5. RPC Functions

### `record_inventory_transaction`

- Row lock ? stock validation ? stock update ? transaction insert
- **Source:** `fix_transaction_relationships.sql`
- **Used by:** `recordTransaction()` Quick Entry IN/OUT

### `set_inventory_stock` (v6.8)

- Parameters: `p_item_id UUID`, `p_new_stock NUMERIC`, `p_note TEXT`
- Row lock ? set absolute stock ? ledger entry (IN/OUT delta)
- **Source:** `sql/sync_inventory_stock.sql`
- **Used by:** `updateInventoryStock()` ? warehouse cell + stock count

### Trigger: `trg_sync_inventory_order_qty`

- `BEFORE INSERT OR UPDATE OF stock, order_point, target_stock`
- `IF stock <= order_point THEN order_qty = target_stock - stock ELSE 0`

### Realtime: `REPLICA IDENTITY FULL`

- Table: `inventory_items` ? full row broadcast on UPDATE

---

## 6. Migration Files

> **[VERIFY] Schema location:** There is no `supabase/migrations/` folder. All schema files live at the repository root (e.g. `DB_SCHEMA.sql`) plus the `sql/` subfolder (`ai_agent_views.sql`, `fix_inventory_rls.sql`, `sync_inventory_stock.sql`). `DB_SCHEMA.sql` is the primary schema. Paths below are relative to the repo root.

| File | Purpose |
| --- | --- |
| `DB_SCHEMA.sql` | Core: profiles, shifts, inventory_items |
| `setup_inventory_transactions.sql` | transactions table + RPC |
| `fix_transaction_relationships.sql` | Rename `product_id` ? `inventory_item_id` |
| `sql/sync_inventory_stock.sql` | v6.8 ? `set_inventory_stock`, trigger, REPLICA IDENTITY |
| `sql/fix_inventory_rls.sql` | RLS hardening ? authenticated-only |
| `apply_rls_transactions.sql` | RLS for transactions |
| `update_rls_policies.sql` | Open RLS for profiles & shifts |
| `inventory_config_schema.sql` | Config table + seed |
| `add_inventory_sort_order.sql` | Add sort_order column |
| `sales_schema.sql` | Sales uploads + records |
| `product_categories_schema.sql` | Product categories |
| `regular_holidays_schema.sql` | Regular holidays per employee |
| `audit_log_schema.sql` | AI audit logging |
| `docs/sql/market_insight_runs.sql` | market_insight_runs table (OPTIONAL ? Market Insights v2 run history) |

> **Deprecated:** `inventory-items.csv` ? removed v6.8. Sort order via `migrate-inventory-sort-order.ts` (DB-only).
