# API Reference — BLACKANDBREW ERP

> Version: 8.3 | Last Updated: 2026-06-09

---

## 1. Server Actions

All server actions use `'use server'` in `src/app/actions/`. Write operations call `assertWritableSession()` unless noted.

---

### 1.1 Auth (`auth.ts`)

| Function | Purpose |
| --- | --- |
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

### 1.4 Holiday (`holiday-actions.ts`)

| Function | Purpose |
| --- | --- |
| `syncHolidays(startDate, endDate)` | Google Calendar → `holidays` table |
| `saveRegularHolidays(profileId, days)` | Save regular holiday days per employee |

---

### 1.5 Maintenance (`maintenance-actions.ts`)

| Function | Purpose |
| --- | --- |
| `saveServiceRecord(record)` | Insert/update `service_records` |
| `deleteServiceRecord(id)` | Delete service record |

---

### 1.6 Sales (`sales-actions.ts`)

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

### 1.7 Market Insights v2

The module is split across five action files in `src/app/actions/`.

#### `market-insights-types.ts`

Zod schemas and TypeScript types - no side effects.

| Export | Kind | Purpose |
| --- | --- | --- |
| `insightBulletSchema` | Zod schema | Single insight bullet: text, confidence, optional reason |
| `behaviorTrendsSchema` | Zod schema | Step 2 output - behavior + trends arrays |
| `strategyActionsSchema` | Zod schema | Step 3 output - strategy bullets + action checklist |
| `MarketInsightsV2` | Interface | Full v2 payload shape (version: 2) |
| `isMarketInsightsV2(v)` | Type guard | Validates cached payload before use |
| `MARKET_INSIGHTS_CACHE_KEY_V2` | Constant | localStorage key `marketInsightsCache_v2` |

#### `market-insights-fetch.ts`

Deterministic data fetchers - no AI calls.

| Function | Purpose |
| --- | --- |
| `fetchWeatherForecast(supabase)` | OpenWeatherMap 5-day forecast filtered to 06:00-18:00 ICT operating window |
| `fetchUpcomingHolidays(supabase)` | Next 30-day public holidays from holidays table |
| `fetchMarketTrends(query)` | Tavily web search with per-query session cache |

#### `market-insights-places.ts`

Optional Google Places integration - skips silently when `GOOGLE_PLACES_API_KEY` is unset.

| Function | Purpose |
| --- | --- |
| `fetchNearbyCompetitors()` | Google Places Nearby Search for cafes within 1 km of store coordinates |

#### `market-insights-context.ts`

Pure builders that transform raw Supabase data into context objects for the AI prompt.

| Function | Purpose |
| --- | --- |
| `buildInventoryContext(storeStatus)` | Low-stock signals from `get_ai_store_status` RPC |
| `buildSalesContext(metrics)` | MoM change, top products, category breakdown |
| `buildSalesSnapshot(metrics)` | Typed `SalesSnapshot` for chart components |
| `buildScheduleContext(schedule)` | Today shift list from `get_today_schedule` RPC |
| `buildScheduleEntries(schedule)` | Typed `ScheduleEntry[]` for ContextPanel |
| `buildSignalsList(ctx)` | Human-readable signal strings injected into AI prompt |
| `buildAlerts(ctx)` | `MarketAlert[]` - stockout risk, overstock, weather, opportunity |
| `buildDiff(prev, next)` | `MarketInsightsDiff` comparing cached vs new signals and actions |

#### `market-insights-actions.ts`

Main server action - multi-step `generateObject` pipeline.

| Function | Purpose |
| --- | --- |
| `getMarketInsights(prev?)` | Full pipeline: fetch context -> Step 2 behavior+trends -> Step 3 strategy+actions -> persist run -> return `MarketInsightsV2` |

Pipeline:

```text
getMarketInsights()
  |-- fetchSupabaseContext()   -> inventory, sales, schedule, transactions (parallel)
  |-- fetchWeatherForecast()   -> OpenWeatherMap (operating window)
  |-- fetchUpcomingHolidays()  -> holidays table
  |-- fetchNearbyCompetitors() -> Google Places (optional)
  |-- fetchMarketTrends()      -> Tavily x 3 queries (cached per query string)
  |-- buildMarketContext()     -> assembles MarketContext (deterministic, no AI)
  |-- generateObject Step 2   -> behaviorTrendsSchema (Gemini gemini-2.5-flash)
  |-- generateObject Step 3   -> strategyActionsSchema (Gemini gemini-2.5-flash)
  |-- persistRun()            -> INSERT into market_insight_runs (optional, fails gracefully)
  +-- return MarketInsightsV2  -> version: 2, cache key: marketInsightsCache_v2
```

---

### 1.8 Daily Report (`daily-report-actions.ts`)

| Function | Purpose |
| --- | --- |
| `fetchTodayShifts(date)` | Shifts for target date |
| `fetchWeatherForecast(date?)` | OpenWeatherMap forecast |
| `fetchNextHoliday(date)` | Next public holiday |
| `compileDailyReportPayload()` | Full LINE report payload |

---

### 1.9 LINE (`line-actions.ts`)

| Function | Purpose |
| --- | --- |
| `sendLineNotification(targetId, message)` | Push text via LINE Messaging API |

---

### 1.10 Migration (`migrate-inventory-sort-order.ts`)

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
