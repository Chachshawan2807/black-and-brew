# Database Schema — BLACKANDBREW ERP

> Version: 8.7 | Last Updated: 2026-06-17 | Engine: Supabase PostgreSQL

---

## 1. Table Overview

| Table | Purpose | RLS | Source SQL |
| --- | --- | --- | --- |
| `profiles` | ข้อมูลพนักงาน 9 คน | ✓ authenticated | `DB_SCHEMA.sql` |
| `shifts` | ตารางกะงาน | ✓ authenticated | `DB_SCHEMA.sql` |
| `inventory_items` | รายการคลังสินค้าและสต็อก | ✓ authenticated | `DB_SCHEMA.sql` + `fix_inventory_rls.sql` |
| `inventory_transactions` | บันทึกการเคลื่อนไหวสต็อก (IN/OUT/ADJUST/ADD/DELETE) | ✓ authenticated | `sql/record_inventory_transaction.sql` + migrations |
| `inventory_count_verifications` | บันทึกผลตรวจนับ vs สต็อกระบบ (`inventory_items.stock`) | ✓ authenticated | `supabase/migrations/20260614120000_inventory_count_verifications.sql` + `20260615120000_inventory_count_accuracy_refactor.sql` |
| `inventory_config` | การตั้งค่าคอลัมน์ Inventory UI | ✓ authenticated | `inventory_config_schema.sql` |
| `holidays` | วันหยุดราชการ | ✓ | Created via `holiday-actions.ts` |
| `regular_holidays` | วันหยุดประจำของพนักงาน | ✓ | `regular_holidays_schema.sql` |
| `service_records` | บันทึกการซ่อมบำรุงอุปกรณ์ | ✓ | Used by maintenance module |
| `sales_uploads` | ไฟล์ Excel ที่อัปโหลด | ✓ | `sales_schema.sql` |
| `sales_records` | รายการยอดขาย | ✓ | `sales_schema.sql` |
| `product_categories` | หมวดหมู่สินค้า | ✓ | `product_categories_schema.sql` |
| `audit_logs` | บันทึก audit สำหรับ AI | ✓ | `audit_log_schema.sql` |
| `login_history` | บันทึกเหตุการณ์เข้าใช้ระบบ (PIN) | ✓ RLS enabled | `supabase/migrations/20260611120000_create_login_history.sql` |
| `data_change_logs` | บันทึกการเปลี่ยนแปลงข้อมูล (actor, field diff) | ✓ RLS + selective read | `supabase/migrations/20260612120000_create_data_change_logs.sql` |
| `revoked_sessions` | fingerprint ที่ถูก revoke จากระยะไกล | ✓ RLS enabled | `supabase/migrations/20260612200000_revoked_sessions.sql` |
| `push_subscriptions` | Web Push endpoints ต่ออุปกรณ์ (cross-device inventory alerts) | ✓ authenticated (own rows) | `supabase/migrations/20260616120000_push_subscriptions.sql` |
| `market_insight_runs` | ประวัติการรัน Market Insights v2 (OPTIONAL) | ✓ | `docs/sql/market_insight_runs.sql` |

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
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  type VARCHAR(10) CHECK (type IN ('IN', 'OUT', 'ADJUST', 'ADD', 'DELETE')),
  quantity NUMERIC NOT NULL CHECK (quantity >= 0),
  note TEXT,
  balance_after NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);
```

> Column is `inventory_item_id` — renamed from `product_id` (historical). ADD/DELETE types added in `supabase/migrations/20260612140000_inventory_add_delete_history.sql`.

### `inventory_count_verifications`

```sql
CREATE TABLE inventory_count_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  counted_qty NUMERIC NOT NULL CHECK (counted_qty >= 0),
  system_stock_qty NUMERIC NOT NULL,
  matched BOOLEAN NOT NULL,
  counted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);
```

Written by `recordCountVerification()` in `inventory-actions.ts`. Baseline is `inventory_items.stock` at count time (before the count update). Match logic: `src/lib/inventory-count-accuracy.ts` (`isCountMatch`). Migration `20260615120000` renamed `in_out_theoretical_qty` → `system_stock_qty` and cleared legacy rows.

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

### `login_history`

Immutable authentication event log with device fingerprinting. Written by `login-history-actions.ts` using the service-role key.

### `data_change_logs`

Immutable append-only mutation log (actor, module, field-level diffs). Inventory module rows are readable by `anon`/`authenticated` for in-app notifications (`supabase/migrations/20260612130000_inventory_notifications.sql`).

### `revoked_sessions`

```sql
CREATE TABLE IF NOT EXISTS public.revoked_sessions (
  session_fingerprint TEXT PRIMARY KEY,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_reason TEXT
);
```

Checked on each auth validation via `src/lib/session-revocation.ts`. Populated by `forceRevokeDeviceSession()` / `forceRevokeAllRemoteSessions()` in `auth.ts`.

### `push_subscriptions`

```sql
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  client_session_id text,
  user_agent text,
  prefs_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);
```

Registered by `registerPushSubscription()` in `push-actions.ts` via authenticated Supabase client (RLS: `auth.uid() = user_id`). Server broadcasts inventory alerts through `dispatchInventoryWebPush()` in `src/lib/web-push.ts` after `data_change_logs` INSERT (primary path) or `POST /api/push/webhook` (optional Supabase Database Webhook backup). Stale endpoints (HTTP 404/410) are auto-deleted.

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

RLS enabled; no public policies — written only by server actions using the service-role key.
Source: `docs/sql/market_insight_runs.sql`. Feature works without this table (`persistRun()` fails gracefully).

---

## 3. RLS Policies

### Current Standard (post `fix_inventory_rls.sql`)

- `inventory_items`, `inventory_config`: `authenticated` role → SELECT/INSERT/UPDATE
- `inventory_transactions`: `authenticated` → SELECT/INSERT/DELETE (no UPDATE — ledger immutability)
- `profiles`, `shifts`: `authenticated` → full CRUD
- `data_change_logs`: `anon_read_inventory_change_logs` — SELECT where `module = 'inventory'` (in-app notifications)
- Client must call `supabase.auth.signInAnonymously()` after PIN gate

### Legacy (pre-hardening)

```sql
-- Deprecated open policies — removed by fix_inventory_rls.sql
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
CREATE INDEX idx_login_history_occurred_at ON login_history (occurred_at DESC);
CREATE INDEX idx_data_change_logs_module_occurred ON data_change_logs (module, occurred_at DESC);
CREATE INDEX idx_revoked_sessions_revoked_at ON revoked_sessions (revoked_at DESC);
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions (user_id);
CREATE INDEX idx_push_subscriptions_client_session ON push_subscriptions (client_session_id) WHERE client_session_id IS NOT NULL;
CREATE INDEX idx_count_verifications_item ON inventory_count_verifications(inventory_item_id);
CREATE INDEX idx_count_verifications_counted_at ON inventory_count_verifications(counted_at DESC);
```

---

## 5. RPC Functions

### `record_inventory_transaction`

- Row lock → stock validation → stock update → transaction insert (IN/OUT only)
- **Source:** `sql/record_inventory_transaction.sql`
- **Used by:** `recordTransaction()`, `recordBulkInventoryTransactions()`

### `set_inventory_stock` (v6.8+)

- Parameters: `p_item_id UUID`, `p_new_stock NUMERIC`, `p_note TEXT`, `p_record_history BOOLEAN DEFAULT TRUE`
- Row lock → set absolute stock → optional ADJUST ledger entry on delta
- **Source:** `sql/sync_inventory_stock.sql`
- **Used by:** `updateInventoryStock()` — warehouse cell + stock count (`recordHistory: false` on count page)

### Trigger: `trg_sync_inventory_order_qty`

- `BEFORE INSERT OR UPDATE OF stock, order_point, target_stock`
- `IF stock <= order_point THEN order_qty = target_stock - stock ELSE 0`

### Realtime: `REPLICA IDENTITY FULL`

- Table: `inventory_items` — full row broadcast on UPDATE
- Table: `data_change_logs` — added to `supabase_realtime` publication for inventory notifications

---

## 6. Migration Files

> **Schema location:** Official migrations live in `supabase/migrations/`. Historical one-shot schemas remain at the repository root (e.g. `DB_SCHEMA.sql`) plus the `sql/` subfolder. `DB_SCHEMA.sql` is the primary reference schema. Apply via `supabase db push` or run migration files in the Supabase Dashboard SQL Editor. Verify remote state: `npm run db:verify`.

### Versioned (`supabase/migrations/`)

| File | Purpose |
| --- | --- |
| `20260611120000_create_login_history.sql` | Login audit trail + device fingerprinting |
| `20260612120000_create_data_change_logs.sql` | Data mutation audit log |
| `20260612130000_inventory_notifications.sql` | Realtime + RLS read for inventory `data_change_logs` |
| `20260612140000_inventory_add_delete_history.sql` | Transaction types ADD/DELETE; nullable `inventory_item_id` |
| `20260612200000_revoked_sessions.sql` | Remote session revocation by fingerprint |
| `20260614120000_inventory_count_verifications.sql` | Count accuracy ledger (initial table) |
| `20260615120000_inventory_count_accuracy_refactor.sql` | Rename to `system_stock_qty`; clear legacy IN/OUT-theoretical rows |
| `20260615130000_align_low_stock_with_purchase_orders.sql` | `view_inventory_summary` LOW status aligned with PO modal (DEC-005) |
| `20260616120000_push_subscriptions.sql` | Web Push subscription storage + RLS (authenticated own rows) |

### Historical (root + `sql/`)

| File | Purpose |
| --- | --- |
| `DB_SCHEMA.sql` | Core: profiles, shifts, inventory_items |
| `sql/record_inventory_transaction.sql` | Atomic IN/OUT RPC reference blueprint |
| `sql/sync_inventory_stock.sql` | v6.8 — `set_inventory_stock`, trigger, REPLICA IDENTITY |
| `sql/fix_inventory_rls.sql` | RLS hardening — authenticated-only |
| `inventory_config_schema.sql` | Config table + seed |
| `sales_schema.sql` | Sales uploads + records |
| `product_categories_schema.sql` | Product categories |
| `regular_holidays_schema.sql` | Regular holidays per employee |
| `audit_log_schema.sql` | AI audit logging |
| `docs/sql/market_insight_runs.sql` | market_insight_runs table (OPTIONAL — Market Insights v2 run history) |

> **Deprecated:** `inventory-items.csv` — removed v6.8. Sort order via `migrate-inventory-sort-order.ts` (DB-only).
