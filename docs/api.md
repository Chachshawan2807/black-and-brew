# API Reference — BLACKANDBREW ERP

> **Version:** 6.3 | **Last Updated:** 2026-06-04

---

## 1. Server Actions

All server actions are defined with `'use server'` directive and located in `src/app/actions/`.

---

### 1.1 `recordTransaction()` — Inventory Actions

- **File:** `src/app/actions/inventory-actions.ts`
- **Purpose:** บันทึก Stock In/Out แบบ Atomic ผ่าน PostgreSQL RPC
- **Signature:**

```typescript
async function recordTransaction(
  productId: string,
  type: 'IN' | 'OUT',
  quantity: number,
  note: string = ''
): Promise<{ success: boolean; error?: string; newStock?: number }>
```

- **Parameters:**

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `productId` | `string` (UUID) | ✅ | ID ของ `inventory_items` |
| `type` | `'IN' \| 'OUT'` | ✅ | ประเภทรายการ |
| `quantity` | `number` | ✅ | จำนวน (ต้อง > 0) |
| `note` | `string` | ❌ | หมายเหตุ (default: '') |

- **Behavior:**

- Calls `supabase.rpc('record_inventory_transaction', ...)` (SECURITY DEFINER)
- RPC performs: row lock → validate stock → update stock → insert transaction
- Returns `{ success: true, newStock }` on success
- Returns `{ success: false, error: 'ยอดคงเหลือไม่เพียงพอ...' }` on insufficient stock
- Calls `revalidatePath('/[locale]/inventory', 'page')` on success

- **Supabase Client:** Service Role Key (bypasses RLS)

---

### 1.2 `fetchTransactionHistory()` — Inventory Actions

**File:** `src/app/actions/inventory-actions.ts`

**Purpose:** ดึงประวัติ transactions พร้อมชื่อสินค้า (Two-Step Fetch)

**Signature:**

```typescript
async function fetchTransactionHistory(
  itemId?: string,
  limit: number = 50
): Promise<{ success: boolean; error?: string; data: any[] }>
```

- **Parameters:**

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `itemId` | `string` (UUID) | ❌ | กรองเฉพาะสินค้า (ถ้าไม่ระบุ = ดึงทั้งหมด) |
| `limit` | `number` | ❌ | จำนวนรายการสูงสุด (default: 50) |

**Behavior:**

1. `unstable_noStore()` — disable Next.js cache
2. Step 1: `SELECT * FROM inventory_transactions` (filtered by `inventory_item_id` if provided)
3. Step 2: `SELECT id, name FROM inventory_items WHERE id IN (unique IDs)`
4. Step 3: Merge item names into transaction records in-memory
5. Returns enriched data with `inventory_items: { name }` on each record

**Supabase Client:** Service Role Key

---

### 1.3 `fetchFrequentItems()` — Inventory Actions

- **File:** `src/app/actions/inventory-actions.ts`
- **Purpose:** ดึง Top 5 สินค้าที่มี transactions บ่อยที่สุด
- **Signature:**

```typescript
async function fetchFrequentItems(): Promise<{
  success: boolean;
  error?: string;
  data?: { id: string; name: string }[]
}>
```

- **Behavior:**

1. Fetch last 100 transactions
2. Count frequency by `inventory_item_id`
3. Select top 5 IDs
4. Fetch names from `inventory_items`
5. Returns `[{ id, name }, ...]`

---

### 1.4 `deleteShift()` — Shift Actions

- **File:** `src/app/actions/shift-actions.ts`
- **Signature:**

```typescript
async function deleteShift(id: string): Promise<{ success: boolean; error?: string }>
```

- **Behavior:**

- Deletes shift by ID from `shifts` table
- Revalidates: `/`, `/[locale]/schedule`, `/[locale]/dashboard`

- **Supabase Client:** Anon Key (via `src/lib/supabase.ts`)

---

### 1.5 `syncHolidays()` — Holiday Actions

- **File:** `src/app/actions/holiday-actions.ts`
- **Signature:**

```typescript
async function syncHolidays(
  startDate: string,
  endDate: string
): Promise<{ success: boolean; error?: string; count?: number }>
```

- **Behavior:**

- Fetches Thai holidays from Google Calendar API
- Upserts into `holidays` table (skips existing dates)
- Revalidates layout on success

---

## 2. PostgreSQL RPC Functions

### 2.1 `record_inventory_transaction`

**Defined in:** `fix_transaction_relationships.sql`

**Signature:**

```sql
FUNCTION record_inventory_transaction(
  p_product_id UUID,
  p_type VARCHAR,
  p_quantity NUMERIC,
  p_note TEXT
) RETURNS json
```

**Behavior:**

1. `SELECT stock FROM inventory_items WHERE id = p_product_id FOR UPDATE` (row lock)
2. Validate: product exists, sufficient stock for OUT
3. Calculate `new_stock`
4. `UPDATE inventory_items SET stock = new_stock`
5. `INSERT INTO inventory_transactions (inventory_item_id, type, quantity, note, balance_after)`
6. Return `{ success: true, new_stock, balance_after }`

**Security:** `SECURITY DEFINER` — executes with function owner's permissions

---

## 3. Client-side Supabase Calls

### Real-time Channel (Inventory)

```typescript
supabase.channel('inventory_changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, callback)
  .subscribe()
```

### Inventory CRUD

| Operation | Method |
| :--- | :--- |
| Fetch All | `supabase.from('inventory_items').select('*').order('sort_order')` |
| Update Field | `supabase.from('inventory_items').update({ [field]: value }).eq('id', id)` |
| Insert Item | `supabase.from('inventory_items').insert([item]).select().single()` |
| Delete Item | `supabase.from('inventory_items').delete().eq('id', id)` |
| Reorder | `supabase.from('inventory_items').upsert(items.map(i => ({ id, sort_order })))` |

### Config Persistence

| Operation | Method |
| :--- | :--- |
| Load Config | `supabase.from('inventory_config').select('settings').eq('id', 'column_labels').single()` |
| Save Config | `supabase.from('inventory_config').upsert({ id: 'column_labels', settings })` |
