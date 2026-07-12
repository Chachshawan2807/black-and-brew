# Architecture — BLACKANDBREW ERP

> Version: 9.2 | Last Updated: 2026-07-12 | Stack: Next.js 16.2.4 + React 19.2.4 + Supabase

---

## 1. Overview

Hybrid PPR architecture: Static Shell (Navigation, Branding) + Dynamic Islands (Real-time data via Supabase `connection()`).

### Tech Stack

- Framework: Next.js 16.2.4 (App Router, `cacheComponents: true`) + React 19.2.4
- Database: Supabase PostgreSQL (Thailand Edge Region)
- Styling: Tailwind CSS 4 + PostCSS + `next-themes` (light/dark/system via `bb-theme`)
- State: Zustand (global), React useState (local)
- i18n: next-intl v4.11.0 (th/en) via `src/proxy.ts`
- DnD: @dnd-kit/core + sortable
- AI: Vercel AI SDK v6 + `@ai-sdk/google` (Gemini)
- Testing: Vitest + Testing Library
- Deploy: Vercel (App Router runtime selected per route/API as implemented)
- Motion: framer-motion + `src/lib/motion-presets.ts` (v6.9)

---

## 2. Authentication Flow

```text
User opens app → PinGateway (sessionStorage check)
→ verifyPin() Server Action → httpOnly cookies + session fingerprint
→ recordLoginEvent() → login_history row
→ ensureSupabaseSession() → anonymous auth for RLS
→ isSessionFingerprintRevoked() on each validation
→ Full access (APP_PIN) or Read-only (APP_READ_ONLY_PIN; dev fallback 111222)
→ Optional trusted-device passkey registration after PIN verification
→ Write actions call assertWritableSession()
→ Settings: forceRevokeDeviceSession() / forceRevokeAllRemoteSessions()
```

| Layer | Storage | Keys |
| --- | :--- | --- |
| Client gate | `sessionStorage` | `bb_auth_pin_verified` |
| Server session | httpOnly cookies | `bb_auth_pin_verified`, `bb_auth_read_only`, `bb_session_fp` |
| Session revocation | `revoked_sessions` table | `session_fingerprint` |
| Login audit | `login_history` table | device + IP + access level |
| Supabase RLS | Anonymous session | `authenticated` role |
| Trusted-device passkeys | `device_passkeys` table | credential ID + public key + session fingerprint |

### Trusted-device Passkeys

```text
PIN verified session → getPasskeyRegistrationOptions()
→ WebAuthn platform authenticator → verifyPasskeyRegistration()
→ UPSERT device_passkeys (credential_id, public_key, counter, access_level)

Returning device → getPasskeyLoginOptions()
→ verifyPasskeyLogin() → counter update + revocation check
→ setAuthCookies() + recordLoginEvent()
```

`WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGIN` override production relying-party values. Without overrides, `resolveWebAuthnContext()` derives the local development context.

---

## 3. Supabase Dual-Client Strategy

| Context | Key | Purpose |
| --- | :--- | --- |
| Client Components (`src/lib/supabase.ts`) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Real-time subs, client reads |
| Server Actions | `SUPABASE_SERVICE_ROLE_KEY` | Admin ops, AI tools, daily report |
| Server Components | `getSupabaseAdmin()` (`src/lib/supabase-server.ts`) | Singleton admin client, `cache: 'no-store'` |

RLS: `sql/fix_inventory_rls.sql` — authenticated-only policies; client must sign in anonymously after PIN.

```typescript
export const supabase = createClient(url, anonKey, {
  realtime: { params: { eventsPerSecond: 2 } },
  db: { schema: 'public' },
});
```

---

## 4. Route Structure

```text
src/app/
├── page.tsx                     # Root redirect → /th
├── manifest.ts                  # PWA manifest
├── actions/
│   ├── auth.ts                        # PIN verify, session revocation, read-only guard
│   ├── passkey-actions.ts             # WebAuthn trusted-device registration/login
│   ├── login-history-actions.ts       # login_history CRUD + active sessions
│   ├── inventory-actions.ts           # Stock RPC, count policy, transactions
│   ├── branch-withdraw-actions.ts     # Branch 2 withdrawal batch
│   ├── shift-actions.ts               # Shift CRUD
│   ├── holiday-actions.ts             # Google Calendar + regular holidays
│   ├── maintenance-actions.ts         # Service records
│   ├── sales-actions.ts               # Excel upload, categories
│   ├── daily-report-actions.ts        # Daily report compiler
│   ├── push-actions.ts                # Web Push subscription register/sync/unregister
│   ├── data-change-log-actions.ts     # Mutation audit + dispatchInventoryWebPush hook
│   └── tools/                         # AI agent tools
├── api/
│   ├── chat/route.ts            # Streaming AI (ToolLoopAgent)
│   ├── daily-report/route.ts    # Vercel Cron endpoint
│   ├── push/webhook/route.ts    # Optional Supabase DB webhook → Web Push dispatch
│   └── inventory/offline-mutation/route.ts  # Service worker background sync replay
└── [locale]/
    ├── layout.tsx               # PinGateway, sidebar, AI chat, PWA
    ├── page.tsx                 # Command Center
    ├── _components/             # LiveStatusTracker (locale-wide)
    ├── dashboard/               # page.tsx + _components/ (LiveShiftList, MonthlyRoster)
    ├── schedule/                # ScheduleClient + _components/
    ├── inventory/               # InventoryClient + _components/ (FAB, modals)
    │   ├── count/               # Stock-taking
    │   ├── accuracy/            # Exact-count accuracy report + gauge
    │   └── branch-withdraw/     # Branch 2 withdrawal batch
    ├── maintenance/             # MaintenanceClient + _components/
    ├── sales/                   # SalesClient + _components/
    └── settings/                # page.tsx + _components/ (theme, sessions, passkeys)
```

i18n middleware entry: `src/proxy.ts` (Next.js 16 App Router convention)

---

## 5. Data Flow Patterns

### Inventory Edit (Spreadsheet)

```text
onChange → local state → onBlur → updateInventoryStock() [RPC set_inventory_stock]
→ optimistic update → Supabase realtime merge → all windows sync
```

### Dashboard Initial Data Loading (v9.0)

```text
Dashboard server route → getDashboardShiftQueryPlan()
→ overlapping week/month ranges: one combined shifts query
→ splitDashboardShiftsByRange() restores weekly LiveShiftList + monthly roster payloads
→ non-overlapping ranges: keep separate shifts queries
```

This keeps the UI payload shape unchanged while avoiding duplicate Supabase shift reads for the common overlapping week/month case.

### Inventory Route Loading + Grid Responsiveness (v9.0)

```text
InventoryClient
→ stable row handlers via useCallback
→ row-level .bb-inventory-row-containment isolates grid render/layout work
→ PurchaseOrdersModal + InventoryHistoryModal in `inventory/_components/` via `next/dynamic`
→ quick-action buttons preload modal chunks on hover/focus intent
```

Spreadsheet behavior, realtime freshness, numeric rules, and mobile layout stay unchanged.

### Stock-Taking Count + Accuracy Verification (v8.9)

```text
CountInput blur → read inventory_items.stock + count_policy (baseline)
→ updateInventoryStock(recordHistory: false)
→ exact_count: recordCountVerification() → INSERT inventory_count_verifications (system_stock_qty, matched)
→ sufficiency_check: skip accuracy scoring; manual order_qty drives purchase order quantity
→ fetchCountAccuracyStats() / fetchInventoryAccuracyReport() for badges and report page
→ AccuracyGauge uses src/lib/inventory-accuracy-gauge.ts on /inventory/accuracy
```

### Branch 2 Withdrawal Batch (v9.2)

```text
BranchWithdrawClient → saveBranchWithdrawal() → rpc('record_branch_withdrawal_batch')
→ INSERT inventory_branch_withdrawals header + per-line IN via set_inventory_stock logic
→ recordDataChange() for inventory notifications; draft in sessionStorage (inventory-branch-withdraw-draft:v1)
→ fetchBranchWithdrawalHistory() / fetchBranchWithdrawalDetail() for history panel
```

### Inventory Realtime Context (v8.6)

```text
InventoryRealtimeProvider → shared items state + Supabase channel on inventory_items
→ mergeInventoryRealtimeUpdate() across warehouse + count pages
→ src/contexts/InventoryRealtimeContext.tsx + src/lib/inventory-queries.ts
```

### Inventory Count Policy (v8.9)

```text
inventory_items.count_policy
→ exact_count: stock threshold computes order_qty; count entries affect accuracy
→ sufficiency_check: staff checks enough/not enough; order_qty is manual and accuracy rows are skipped
→ computeItemsToOrder() uses manual order_qty for sufficiency-check items
```

### Inventory Quick Action libs (v8.6)

```text
InventoryQuickActionFAB → use-inventory-quick-action hook
→ inventory-quick-action-draft.ts   — draft persistence
→ inventory-quick-bulk.ts           — bulk entry batching
→ inventory-quick-qty-step.ts         — qty stepper logic
→ inventory-quick-search-filter.ts  — item search/filter
→ recordBulkInventoryTransactions() server action
```

### Transaction Recording (Atomic via RPC)

```text
Quick Entry / FAB → recordTransaction() → supabase.rpc('record_inventory_transaction')
→ Row Lock (FOR UPDATE) → Validate → UPDATE stock → INSERT transaction → RETURN
```

### Inventory In-App + Cross-Device Web Push Notifications

```text
Server mutation → recordDataChange() → data_change_logs INSERT (module=inventory)
→ Supabase Realtime on data_change_logs → useInventoryNotifications() (same device)
→ dispatchInventoryWebPush() (fire-and-forget) → web-push → push_subscriptions rows
→ PushSubscriptionManager (layout) registers endpoint via registerPushSubscription()
→ NotificationPreferencesSection syncs prefs to push_subscriptions.prefs_json
→ Unread badge: notification-unread-counter.ts + notification-badge.ts + notification-sync.ts (cross-tab + IDB)
→ Optional backup: Supabase Database Webhook → POST /api/push/webhook (PUSH_WEBHOOK_SECRET)
```

Skips origin device when `client_session_id` matches mutation metadata. Requires `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`; fails gracefully when unset or table missing. Daily schedule report pushes reuse `push_subscriptions` with `profile_id` and `branch_id` filters so the same subscription table covers inventory alerts and scheduled staff reports.

### Offline Mutation Replay

```text
Inventory edit (offline) → offline-mutation-queue.ts → IndexedDB queue
→ Service Worker (public/sw.js) background sync → POST /api/inventory/offline-mutation
→ requireMutationAccess() (src/lib/policies/server-gate.ts)
→ replayOfflineMutation() (src/lib/offline-mutation-sync.ts)
→ inventory_field → updateInventoryItemField()
→ inventory_stock → updateInventoryStock() [set_inventory_stock RPC]
→ transaction → recordTransaction() [record_inventory_transaction RPC]
→ offline-replay-retry.ts for back-off on transient failures
```

Client-side state: `src/lib/offline-mutation-client.ts`; auth session bridge: `src/lib/offline-auth-session.ts`; mutation store: `public/offline-mutation-store.js`.

### AI Chat

```text
AIChatOverlay → POST /api/chat → ToolLoopAgent (Gemini 2.5 Flash)
→ tools: getDailyShifts, getStoreStatus, getSalesSummary, getInventoryLedger, getInventoryItemDetails, readTable, internetSearchTool
→ short-circuits: schedule, maintenance, low-stock, sales, holidays, store status (multi-turn aware)
→ streaming response → XSS sanitization on display
```

> AI tools live in `src/app/actions/tools/`; chat orchestration in `src/app/api/chat/route.ts`.

### Daily Web Push Report

```text
Vercel Cron → /api/daily-report → compileDailyReportPayload()
→ shifts + holidays
→ dispatch daily schedule Web Push to eligible push_subscriptions (branch/profile scoped)
```

---

## 5b. AI Data Access Map (AI-GATEWAY-P3)

Every read the AI layer performs funnels through `src/lib/ai-data-gateway.ts` — the single doorway between the LLM tools and Supabase. This keeps the Service Role client, the DEC-069 column presets, and the `SECURITY DEFINER` RPCs as the only ways the model can touch data.

**Auth gate:** `/api/chat` requires a full (non–read-only) PIN session. Read-only kiosk accounts are rejected because AI tools run through the Service Role client (RLS bypass).

```text
LLM (Gemini) — ToolLoopAgent
  │
  ├─ getDailyShifts(date) ──────────▶ fetchDailyShiftsByDate() (DEC-068)
  │                                    canonical grouped roster; use for daily schedule Q&A
  │
  └─ readTable(tableName, filters?, limit?)
        │
        ▼
     readTableTool.execute          ← src/app/actions/tools/database-tools.ts (routing + shaping only)
        │
        ├─ inventory_items, no filters ──▶ fetchTablePreset + computeItemsToOrder()
        │                                   (PO-modal parity for low-stock counts)
        │
        ├─ shifts + YYYY-MM-DD filter ─────▶ fetchShiftsByDate(date)
        │
        └─ all other allowed tables ───────▶ fetchTablePreset(table, filters?, limit?)
                                              └─ admin.from(table).select(PRESET).limit(MAX)
```

### AI-readable tables (18 — all `public` ERP tables)

| Domain | Tables | Default row limit |
| --- | --- | --- |
| Schedule | `profiles`, `shifts`, `holidays`, `regular_holidays` | 200–500 |
| Inventory | `inventory_items`, `inventory_config`, `inventory_transactions`, `inventory_count_verifications` | 50–1000 |
| Maintenance | `service_records` | 1000 |
| Sales | `sales_uploads`, `sales_records`, `product_categories` | 100–2000 |
| System / audit | `audit_logs`, `login_history`, `data_change_logs`, `revoked_sessions`, `push_subscriptions`, `device_passkeys` | 50–2000 |

Source of truth: `AI_ALLOWED_TABLES`, `TABLE_COLUMN_PRESETS`, and `TABLE_MAX_LIMITS` in `src/lib/ai-data-gateway.ts`.

### Gateway surface

| Function | Backing source | Returns | Notes |
| --- | :--- | --- | :--- |
| `fetchInventorySummary()` | `rpc('get_ai_store_status')` | `{ inventory_summary, low_stock_items, shifts, timestamp }` | Optional snapshot RPC; `readTable` inventory path uses `fetchTablePreset` + `computeItemsToOrder` |
| `fetchShiftsByDate(date)` | `fetchDailyShiftsByDate` | `FormattedDailyShifts` | Canonical grouped roster (front_store / other_duty / off_or_leave) |
| `fetchTablePreset(table, filters?, limit?)` | `admin.from(table).select(PRESET)` | `{ ok, rows, effectiveLimit, is_complete_dataset }` | Only ever selects `TABLE_COLUMN_PRESETS[table]`; rejects unknown tables |

### Query rules

- **Filters:** equality (`eq`) only at the DB layer; date-only `shifts.start_time` expands to a full-day range.
- **Columns:** AI-supplied `columns` are ignored; presets are enforced (DEC-069).
- **Limits:** per-table defaults in `TABLE_MAX_LIMITS`; optional `limit` capped at 1000 in the tool schema.
- **Completeness:** responses include `is_complete_dataset` when row count equals the effective limit (data may be truncated).

### Excluded columns (by preset, not readable by AI)

| Table | Excluded | Reason |
| --- | --- | --- |
| `push_subscriptions` | `endpoint`, `p256dh`, `auth` | Web Push encryption secrets |
| `device_passkeys` | `public_key` | WebAuthn credential secret |

### Invariants

- DEC-069 preset lockdown: `fetchTablePreset` ignores any AI-supplied `columns`; it always selects the table preset. Arbitrary column selection (a data-exfiltration vector through the RLS-bypassing Service Role client) is impossible by construction.
- RPC snapshot: `get_ai_store_status` (`sql/ai_agent_views.sql`) remains available via `fetchInventorySummary()` for store-status snapshots. LOW status uses `stock <= order_point AND target_stock > stock` (migration `20260615130000`). Do not delete `sql/ai_agent_views.sql`.
- Single doorway: `database-tools.ts` routes and shapes only. Add new AI-readable tables to `ai-data-gateway.ts` — never open a second Supabase admin client in a tool.
- New public tables: add to `AI_ALLOWED_TABLES`, define a column preset, set `TABLE_MAX_LIMITS`, and extend tests in `src/test/ai-data-gateway.test.ts`.

---

## 6. State Management

| Type | Tool | Scope |
| --- | :--- | --- |
| Global UI | Zustand | Sidebar toggle |
| Auth | AuthProvider + cookies | PIN session, read-only |
| Page-level | useState | Items, columns, modals |
| History | undoStack/redoStack | Inventory undo/redo |
| Persistence | localStorage + `inventory_config` | Column widths/labels |
| Real-time | Supabase Channels + `InventoryRealtimeContext` | Cross-device sync |
| Tooltips | `AppTooltipProvider` + `HintTooltip` | Global tooltip delay + icon hints |

---

## 7. External Integrations

| Service | Auth | Purpose |
| --- | :--- | --- |
| Supabase | Anon + Service Role | DB, Auth, Real-time |
| Google Calendar API | `GOOGLE_CALENDAR_API_KEY` | Thai holiday sync |
| Google Gemini | `GOOGLE_GENERATIVE_AI_API_KEY` | AI Chat (`@ai-sdk/google`) |
| Tavily | `TAVILY_API_KEY` | AI web search |
| Web Push (VAPID) | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` | Cross-device inventory alerts via `web-push` |
| Vercel | Git deployment | App hosting + Cron |

---

## 8. Motion Architecture (v6.9)

| Layer | Implementation | Scope |
| --- | :--- | --- |
| Route transitions | `PageTransition` + `motion-presets.pageContent` | All pages via `SidebarLayout` |
| Modals / Sheets | CSS `.bb-modal-*` + framer `modalContent` | Schedule, Maintenance, Inventory PO |
| Toasts / Alerts | `FloatingAlert`, `FloatingToast` | Schedule holiday warning, Maintenance save |
| Micro-interactions | `.bb-transition`, Button `duration-200` | Buttons, inputs, sidebar links |
| CSS utilities | `globals.css` `@layer utilities` | `animate-in`, `fade-in`, `zoom-in-95`, `slide-*` |

Constraint: Motion changes opacity/transform only — no layout position or dimension changes on desktop/mobile.
