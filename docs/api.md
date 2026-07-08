# API Reference — BLACKANDBREW ERP

> Version: 9.0 | Last Updated: 2026-06-22

---

## 1. Server Actions

All server actions use `'use server'` in `src/app/actions/`. Write operations call `assertWritableSession()` unless noted.

---

### 1.1 Auth (`auth.ts`)

| Function | Purpose |
| --- | --- |
| `verifyPin(pin, device?)` | ตรวจ PIN → set httpOnly cookies + session fingerprint; returns `{ success, isReadOnly? }` |
| `checkAuth()` | ตรวจว่า PIN verified หรือไม่ (รวม revoked fingerprint) |
| `getAuthSessionInfo()` | คืนสถานะ session ปัจจุบัน |
| `getCurrentSessionFingerprint()` | คืน fingerprint ของ session ปัจจุบัน |
| `isReadOnlySession()` | ตรวจ read-only mode |
| `assertWritableSession()` | บล็อก write ถ้า read-only → `{ ok: false, error }` |
| `clearAuth(device?)` | ลบ auth cookies + บันทึก logout event |
| `forceRevokeDeviceSession(fingerprint)` | Revoke session อุปกรณ์เดียว → `revoked_sessions` |
| `forceRevokeAllRemoteSessions(exceptCurrent?)` | Revoke ทุก session ยกเว้นปัจจุบัน (ถ้าระบุ) |

- Full PIN: `APP_PIN` (env)
- Read-only PIN: `APP_READ_ONLY_PIN` (env); dev fallback `111222` in `src/lib/security/read-only-pin.ts`

---

### 1.2 Passkeys (`passkey-actions.ts`)

| Function | Purpose |
| --- | --- |
| `checkDeviceHasPasskey(sessionFingerprint)` | ตรวจว่า fingerprint ปัจจุบันมี credential ใน `device_passkeys` หรือไม่ |
| `getPasskeyRegistrationOptions(device)` | สร้าง WebAuthn registration options หลัง PIN verified |
| `verifyPasskeyRegistration(responseJSON, device)` | Verify registration แล้ว upsert credential, public key, counter, device label, access level |
| `getPasskeyLoginOptions()` | สร้าง discoverable-credential authentication options |
| `verifyPasskeyLogin(responseJSON, device)` | Verify assertion, update counter/last-used, restore auth cookies, clear revocation |
| `removePasskeyForCurrentDevice()` | ลบ passkey ของอุปกรณ์ปัจจุบันจาก Settings |
| `getCurrentDevicePasskeyStatus()` | คืนสถานะ enrolled + device label สำหรับ Settings |

Requires `device_passkeys` migration and optional production env overrides `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN`.

---

### 1.3 Inventory (`inventory-actions.ts`)

#### `recordTransaction(productId, type, quantity, note?, auditOptions?)`

- Atomic IN/OUT via `supabase.rpc('record_inventory_transaction')`
- Returns `{ success, newStock? }` or insufficient stock error
- Revalidates inventory + count pages

#### `recordBulkInventoryTransactions(entries, note?, auditOptions?)` (v8.6)

- Bulk Quick Entry — sequential RPC calls per entry
- `entries`: `{ itemId, type: 'IN'|'OUT', quantity }[]`
- Returns `{ success, results: BulkInventoryTransactionResult[], error? }`

#### `updateInventoryStock(itemId, stock, note?, options?)` (v6.8+)

- Absolute stock set via `supabase.rpc('set_inventory_stock')`
- `options.recordHistory` (default `true`) — when `false`, skips ADJUST ledger (stock-taking count page)
- Fallback to direct UPDATE if RPC not deployed
- Source: `sql/sync_inventory_stock.sql`

#### `updateInventoryItemField(itemId, field, value)` (v8.9)

- Field update action for editable inventory fields including `count_policy`
- `count_policy` accepts `exact_count` or `sufficiency_check`; unknown values normalize to `exact_count`
- `sufficiency_check` items use manual `order_qty` and are excluded from count accuracy scoring

#### `recordCountVerification(itemId, countedQty)` (v8.9)

- Reads `inventory_items.stock` and `count_policy` as baseline before count update
- Inserts into `inventory_count_verifications` with `system_stock_qty` and `matched` flag via `isCountMatch()` (`src/lib/inventory-count-accuracy.ts`)
- `exact_count`: returns `{ success, matched, systemStockQty, countedQty }`
- `sufficiency_check`: returns `{ success, skipped: true, ... }` and does not insert an accuracy row
- Only invoked from stock-taking count page — not manual warehouse overrides

#### `fetchCountAccuracyStats()` (v8.6)

- Aggregates per-item and overall accuracy from `inventory_count_verifications`
- Returns `{ perItem, overall: { totalChecks, matchChecks, accuracyPct } }`

#### `fetchInventoryAccuracyReport()` (v8.9)

- Report data for `/[locale]/inventory/accuracy`
- Aggregates overall accuracy plus high-discrepancy item rows
- Only includes items whose `count_policy` is `exact_count`

#### `recordItemAddHistory(itemId, stock?, itemName?)`

- Inserts ADD lifecycle ledger row after new item creation

#### `fetchTransactionHistory(itemId?, limit?)`

- Two-Step Fetch: transactions → item names merge in-memory
- Uses `unstable_noStore()` — no Next.js cache

#### `fetchFrequentItems()`

- Top 5 items by transaction frequency (last 100 txns)

#### `deleteInventoryItem(itemId)` / `deleteInventoryItemsBulk(itemIds)`

- Delete with `assertWritableSession()` guard

#### `fetchComprehensiveInventoryData()`

- Full inventory dataset for AI/analysis

Client: Service Role Key

---

### 1.4 Shift (`shift-actions.ts`)

| Function | Purpose |
| --- | --- |
| `saveShift(payload)` | Create/update shift (atomic delete-then-insert) |
| `deleteShift(id)` | Delete shift by ID |
| `updateStaffOrder(orderedIds)` | Reorder staff in schedule |
| `updateDashboardOrder(orderedIds)` | Reorder dashboard staff |
| `deleteManagementHistoryRange(employeeId, start, end)` | Bulk delete shifts in range |
| `fetchRosterData(start, end)` | Fetch roster for date range |
| `copyWeeklyShifts(sourceStart, targetStart)` | Copy week of shifts |
| `revalidateAppPaths()` | Revalidate all app paths |

---

### 1.5 Holiday (`holiday-actions.ts`)

| Function | Purpose |
| --- | --- |
| `syncHolidays(startDate, endDate)` | Google Calendar → `holidays` table |
| `saveRegularHolidays(profileId, days)` | Save regular holiday days per employee |

---

### 1.6 Maintenance (`maintenance-actions.ts`)

| Function | Purpose |
| --- | --- |
| `saveServiceRecord(record)` | Insert/update `service_records` |
| `deleteServiceRecord(id)` | Delete service record |

---

### 1.7 Sales (`sales-actions.ts`)

| Function | Purpose |
| --- | --- |
| `uploadSalesFiles(formData)` | Parse Excel → `sales_uploads` + `sales_records` |
| `fetchSalesHistory(page, pageSize)` | Paginated upload history |
| `deleteSalesUpload(uploadId)` | Delete upload + cascading records |
| `getAllProductCategories()` | List product categories |
| `updateProductCategory(name, category)` | Update category mapping |
| `deleteCategory(name)` | Delete category |
| `autoCategorizeAllProducts()` | AI auto-categorize |
| `getSalesMetrics(start?, end?)` | Sales metrics for date range |

---

### 1.9 Daily Report (`daily-report-actions.ts`)

| Function | Purpose |
| --- | --- |
| `fetchTodayShifts(date)` | Shifts for target date |
| `fetchWeatherForecast(date?)` | OpenWeatherMap forecast |
| `fetchNextHoliday(date)` | Next public holiday |
| `compileDailyReportPayload()` | Full daily report payload |

Daily schedule Web Push delivery is handled by `src/lib/daily-report-web-push.ts`, reusing `push_subscriptions` rows with `branch_id` and optional `profile_id` filters.

---

### 1.10 Login History (`login-history-actions.ts`)

| Function | Purpose |
| --- | --- |
| `recordLoginEvent(input)` | บันทึก login/logout/lockout → `login_history` (service-role) |
| `fetchLoginHistory(limit?)` | ดึงประวัติการเข้าใช้สำหรับ Settings |
| `fetchActiveLoginSessions()` | คืน active sessions พร้อมสถานะ revoked |

---

### 1.12 Push (`push-actions.ts`)

| Function | Purpose |
| --- | --- |
| `registerPushSubscription(input)` | Upsert Web Push endpoint + keys into `push_subscriptions` (authenticated RLS); stores `branch_id` and initializes `profile_id` when available |
| `syncPushSubscriptionPrefs(input)` | Update `prefs_json` for an existing endpoint |
| `unregisterPushSubscription(input)` | Delete subscription row by endpoint |
| `getPushDiagnostics()` | Admin-style counts: subscription rows, VAPID configured, latest eligible log |

Requires PIN session + Supabase anonymous `accessToken` so RLS policies apply. `push_subscriptions` is shared by inventory cross-device alerts and daily schedule Web Push reports.

---

### 1.13 Migration (`migrate-inventory-sort-order.ts`)

| Function | Purpose |
| --- | --- |
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
- Compiles daily schedule report data
- Sends daily schedule Web Push broadcasts through `push_subscriptions.branch_id` / `profile_id`

### `GET /api/weather`

- OpenWeatherMap proxy with 30-min cache (`s-maxage=1800`)
- Coordinates: store lat/lon from env

### `POST /api/push/webhook`

- Optional Supabase Database Webhook target for inventory `data_change_logs` INSERTs
- Protected by `PUSH_WEBHOOK_SECRET` (`Authorization: Bearer …`)
- Dispatches `dispatchInventoryWebPush()` — backup when server-action hook is unavailable
- Skips non-INSERT events and rows where `module !== 'inventory'` or `status !== 'success'`

---

## 3. PostgreSQL RPC Functions

### `record_inventory_transaction`

- Source: `sql/record_inventory_transaction.sql`
- Row lock → validate → update stock → insert transaction (IN/OUT only)
- `SECURITY DEFINER`

### `set_inventory_stock` (v6.8+)

- Source: `sql/sync_inventory_stock.sql`
- Parameters: `p_item_id`, `p_new_stock`, `p_note`, `p_record_history` (default `true`)
- Row lock → set absolute stock → optional ADJUST ledger entry on delta

### `inventory_items.count_policy` (v8.9)

- Source: `supabase/migrations/20260618163100_inventory_count_policy.sql`
- Values: `exact_count`, `sufficiency_check`
- `exact_count`: participates in count accuracy and computed purchase order quantity
- `sufficiency_check`: excluded from accuracy scoring; `order_qty` is manual

---

## 4. Client-side Supabase Calls

### Real-time Channels

Inventory stock sync:

```typescript
supabase.channel('inventory_changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, callback)
  .subscribe()
```

Inventory change notifications (`use-inventory-notifications.ts`):

```typescript
supabase.channel('inventory_change_logs')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'data_change_logs', filter: 'module=eq.inventory' }, callback)
  .subscribe()
```

### Inventory CRUD

| Operation | Method |
| --- | --- |
| Fetch All | `.from('inventory_items').select('*').order('sort_order')` |
| Update Field | `.update({ [field]: value }).eq('id', id)` |
| Insert Item | `.insert([item]).select().single()` |
| Delete Item | `.delete().eq('id', id)` |
| Reorder | `.upsert(items.map(i => ({ id, sort_order })))` |

### Config Persistence

| Operation | Method |
| --- | --- |
| Load Config | `.from('inventory_config').select('settings').eq('id', 'column_labels').single()` |
| Save Config | `.from('inventory_config').upsert({ id: 'column_labels', settings })` |
