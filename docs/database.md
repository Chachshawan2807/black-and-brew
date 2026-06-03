# Database Schema — BLACKANDBREW ERP

> **Version:** 6.3 | **Last Updated:** 2026-06-04 | **Engine:** Supabase PostgreSQL

---

## 1. Table Overview

| Table | Purpose | RLS | Source SQL |
| :--- | :--- | :--- | :--- |
| `profiles` | ข้อมูลพนักงาน 9 คน | ✅ Enabled (ALL for authenticated) | `DB_SCHEMA.sql` |
| `shifts` | ตารางกะงาน | ✅ Enabled (ALL for authenticated) | `DB_SCHEMA.sql` |
| `inventory_items` | รายการสินค้าในคลัง | ✅ Enabled (ALL for public) | `DB_SCHEMA.sql` |
| `inventory_transactions` | ประวัติการเคลื่อนไหวสต็อก | ✅ Enabled (SELECT/INSERT/DELETE for authenticated) | `setup_inventory_transactions.sql` |
| `inventory_config` | ตั้งค่าคอลัมน์ Inventory UI | ✅ Enabled (ALL for public) | `inventory_config_schema.sql` |
| `holidays` | วันหยุดราชการจาก Google Calendar | — | Created via `holiday-actions.ts` |

---

## 2. Table Schemas

### 2.1 `profiles`

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 `shifts`

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

### 2.3 `inventory_items`

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

### 2.4 `inventory_transactions`

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

> **IMPORTANT:** Column is `inventory_item_id` — renamed from `product_id` via `fix_transaction_relationships.sql`

### 2.5 `inventory_config`

```sql
CREATE TABLE inventory_config (
  id TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Settings JSON Structure

```json
{
  "order": ["name", "stock", "order_qty", "order_point", "target_stock", "unit", "source"],
  "labels": {
    "name": "ชื่อรายการ",
    "stock": "คงเหลือ",
    "order_qty": "จำนวนสั่งซื้อ",
    "order_point": "จุดสั่งซื้อ",
    "target_stock": "จำนวนที่ต้องมี",
    "unit": "หน่วย",
    "source": "ช่องทางสั่งซื้อ"
  },
  "widths": { ... }
}
```

---

## 3. RLS Policies

### `profiles` & `shifts`

```sql
-- Authenticated full access (collaborative)
CREATE POLICY "Allow authenticated users full access to profiles"
  ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access to shifts"
  ON shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### `inventory_items`

```sql
-- Public access (initial phase)
CREATE POLICY "Public access for inventory_items"
  ON inventory_items FOR ALL USING (true) WITH CHECK (true);
```

### `inventory_transactions`

```sql
-- Authenticated: SELECT, INSERT, DELETE (no UPDATE — ledger immutability)
CREATE POLICY "Allow authenticated users to view all transactions"
  ON inventory_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert transactions"
  ON inventory_transactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete transactions"
  ON inventory_transactions FOR DELETE TO authenticated USING (true);
```

### `inventory_config`

```sql
CREATE POLICY "Public access for inventory_config"
  ON inventory_config FOR ALL USING (true) WITH CHECK (true);
```

---

## 4. Indexes

```sql
-- shifts
CREATE INDEX idx_shifts_time_range ON shifts (start_time, end_time);
CREATE INDEX idx_employee_shifts ON shifts (employee_id);

-- inventory_items
CREATE INDEX idx_inventory_items_name ON inventory_items (name);
CREATE INDEX idx_inventory_items_sort ON inventory_items (sort_order);

-- inventory_transactions
CREATE INDEX idx_inventory_transactions_product_id ON inventory_transactions(inventory_item_id);
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at DESC);
```

---

## 5. RPC Functions

### `record_inventory_transaction`

- **Security:** `SECURITY DEFINER`
- **Performs:** Row lock → stock validation → stock update → transaction insert
- **Atomic:** Full rollback on any failure
- **Source:** `fix_transaction_relationships.sql`

---

## 6. Migration Files

| File | Purpose |
| :--- | :--- |
| `DB_SCHEMA.sql` | Core tables: profiles, shifts, inventory_items |
| `setup_inventory_transactions.sql` | transactions table + RPC (original with `product_id`) |
| `fix_transaction_relationships.sql` | Rename `product_id` → `inventory_item_id` + updated RPC |
| `apply_rls_transactions.sql` | RLS policies for transactions |
| `update_rls_policies.sql` | Open RLS for profiles & shifts |
| `inventory_config_schema.sql` | Config table + seed data |
| `add_inventory_sort_order.sql` | Add sort_order column |
| `inventory_master_access.sql` | Additional access policies |
| `inventory_schema_sync.sql` | Schema alignment script |
