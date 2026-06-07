# API Reference — BLACKANDBREW ERP

> **Version:** 8.1 | **Last Updated:** 2026-06-08

---

## 1. Server Actions

All server actions use `'use server'` in `src/app/actions/`. Write operations call `assertWritableSession()` unless noted.

---

### 1.1 Auth (`auth.ts`)

| Function | Purpose |
| :--- | :--- |
| `verifyPin(pin)` | ตรวจ PIN → set httpOnly cookies; returns `{ success, isReadOnly? }` |
| `checkAuth()` | ตรวจว่า PIN verified หรือไม่ |
| `isReadOnlySession()` | ตรวจ read-only mode |
| `assertWritableSession()` | บล็อก write ถ้า read-only → `{ ok: false, error }` |
| `clearAuth()` | ลบ auth cookies |

- Full PIN: `APP_PIN` (env)
- Read-only PIN: `111222` (hardcoded in `auth-constants.ts`)

---

### 1.2 Inventory (`inventory-actions.ts`)

#### `recordTransaction(productId, type, quantity, note?)`

- Atomic IN/OUT via `supabase.rpc('record_inventory_transaction')`
- Returns `{ success, newStock? }` or insufficient stock error
- Revalidates inventory + count pages

#### `updateInventoryStock(itemId, stock, note?)` (v6.8)

- Absolute stock set via `supabase.rpc('set_inventory_stock')`
- Fallback to direct UPDATE if RPC not deployed
- Source: `sql/sync_inventory_stock.sql`

#### `fetchTransactionHistory(itemId?, limit?)`

- Two-Step Fetch: transactions → item names merge in-memory
- Uses `unstable_noStore()` — no Next.js cache

#### `fetchFrequentItems()`

- Top 5 items by transaction frequency (last 100 txns)

#### `deleteInventoryItem(itemId)` / `deleteInventoryItemsBulk(itemIds)`

- Delete with `assertWritableSession()` guard

#### `fetchComprehensiveInventoryData()`

- Full inventory dataset for AI/analysis

**Client:** Service Role Key

---

### 1.3 Shift (`shift-actions.ts`)

| Function | Purpose |
| :--- | :--- |
| `saveShift(payload)` | Create/update shift (atomic delete-then-insert) |
| `deleteShift(id)` | Delete shift by ID |
| `updateStaffOrder(orderedIds)` | Reorder staff in schedule |
| `updateDashboardOrder(orderedIds)` | Reorder dashboard staff |
| `deleteManagementHistoryRange(employeeId, start, end)` | Bulk delete shifts in range |
| `fetchRosterData(start, end)` | Fetch roster for date range |
| `copyWeeklyShifts(sourceStart, targetStart)` | Copy week of shifts |
| `revalidateAppPaths()` | Revalidate all app paths |

---

### 1.4 Holiday (`holiday-actions.ts`)

| Function | Purpose |
| :--- | :--- |
| `syncHolidays(startDate, endDate)` | Google Calendar → `holidays` table |
| `saveRegularHolidays(profileId, days)` | Save regular holiday days per employee |

---

### 1.5 Maintenance (`maintenance-actions.ts`)

| Function | Purpose |
| :--- | :--- |
| `saveServiceRecord(record)` | Insert/update `service_records` |
| `deleteServiceRecord(id)` | Delete service record |

---

### 1.6 Sales (`sales-actions.ts`)

| Function | Purpose |
| :--- | :--- |
| `uploadSalesFiles(formData)` | Parse Excel → `sales_uploads` + `sales_records` |
| `fetchSalesHistory(page, pageSize)` | Paginated upload history |
| `deleteSalesUpload(uploadId)` | Delete upload + cascading records |
| `getAllProductCategories()` | List product categories |
| `updateProductCategory(name, category)` | Update category mapping |
| `deleteCategory(name)` | Delete category |
| `autoCategorizeAllProducts()` | AI auto-categorize |
| `getSalesMetrics(start?, end?)` | Sales metrics for date range |

---

### 1.7 Market Insights (`market-insights-actions.ts`)

| Function | Purpose |
| :--- | :--- |
| `getMarketInsights()` | Gemini analysis combining inventory, sales, schedule, weather |

---

### 1.8 Daily Report (`daily-report-actions.ts`)

| Function | Purpose |
| :--- | :--- |
| `fetchTodayShifts(date)` | Shifts for target date |
| `fetchWeatherForecast(date?)` | OpenWeatherMap forecast |
| `fetchNextHoliday(date)` | Next public holiday |
| `compileDailyReportPayload()` | Full LINE report payload |

---

### 1.9 LINE (`line-actions.ts`)

| Function | Purpose |
| :--- | :--- |
| `sendLineNotification(targetId, message)` | Push text via LINE Messaging API |

---

### 1.10 Migration (`migrate-inventory-sort-order.ts`)

| Function | Purpose |
| :--- | :--- |
| `runInventoryMigration()` | DB-only `sort_order` re-sequence (no CSV) |

---

## 2. API Routes

### `POST /api/chat`

- Streaming AI chat via `ToolLoopAgent` (`google('gemini-2.5-flash')`)
- Tools: `getDailyShifts`, `readTable`, `internetSearchTool` (weather is served through `internetSearchTool` — no separate weather tool)
- Daily-schedule queries short-circuit to a deterministic SSE stream (no LLM) via `create-deterministic-chat-stream`
- Server-side auth gate: PIN cookie or Supabase user required (401 otherwise)
- Weighted intent scoring selects tools + `maxSteps`; sliding-window memory + Thai token optimizer

### `GET /api/daily-report`

- Vercel Cron endpoint — protected by `CRON_SECRET`
- Compiles + sends LINE daily notification

### `GET /api/weather`

- OpenWeatherMap proxy with 30-min cache (`s-maxage=1800`)
- Coordinates: store lat/lon from env

---

## 3. PostgreSQL RPC Functions

### `record_inventory_transaction`

- **Source:** `fix_transaction_relationships.sql`
- Row lock → validate → update stock → insert transaction
- `SECURITY DEFINER`

### `set_inventory_stock` (v6.8)

- **Source:** `sql/sync_inventory_stock.sql`
- Parameters: `p_item_id`, `p_new_stock`, `p_note`
- Row lock → set absolute stock → ledger entry on delta

---

## 4. Client-side Supabase Calls

### Real-time Channel (Inventory)

```typescript
supabase.channel('inventory_changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, callback)
  .subscribe()
```

### Inventory CRUD

| Operation | Method |
| :--- | :--- |
| Fetch All | `.from('inventory_items').select('*').order('sort_order')` |
| Update Field | `.update({ [field]: value }).eq('id', id)` |
| Insert Item | `.insert([item]).select().single()` |
| Delete Item | `.delete().eq('id', id)` |
| Reorder | `.upsert(items.map(i => ({ id, sort_order })))` |

### Config Persistence

| Operation | Method |
| :--- | :--- |
| Load Config | `.from('inventory_config').select('settings').eq('id', 'column_labels').single()` |
| Save Config | `.from('inventory_config').upsert({ id: 'column_labels', settings })` |
