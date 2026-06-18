# Architecture — BLACKANDBREW ERP

> Version: 8.9 | Last Updated: 2026-06-19 | Stack: Next.js 16.2.4 + React 19.2.4 + Supabase

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
│   ├── shift-actions.ts               # Shift CRUD
│   ├── holiday-actions.ts             # Google Calendar + regular holidays
│   ├── maintenance-actions.ts         # Service records
│   ├── sales-actions.ts               # Excel upload, categories
│   ├── market-insights-types.ts       # v2 Zod schemas + TS types
│   ├── market-insights-fetch.ts       # Weather forecast, holidays, local events, Tavily multi-cache
│   ├── market-insights-places.ts      # Google Places nearby competitors (OPTION)
│   ├── market-insights-context.ts     # Deterministic context builders
│   ├── market-insights-actions.ts     # getMarketInsights() multi-step generateObject pipeline
│   ├── daily-report-actions.ts        # LINE report compiler
│   ├── line-actions.ts
│   ├── push-actions.ts                # Web Push subscription register/sync/unregister
│   ├── data-change-log-actions.ts     # Mutation audit + dispatchInventoryWebPush hook
│   └── tools/                         # AI agent tools
├── api/
│   ├── chat/route.ts            # Streaming AI (ToolLoopAgent)
│   ├── daily-report/route.ts    # Vercel Cron endpoint
│   ├── push/webhook/route.ts    # Optional Supabase DB webhook → Web Push dispatch
│   └── weather/route.ts         # OpenWeatherMap proxy
└── [locale]/
    ├── layout.tsx               # PinGateway, sidebar, AI chat, PWA
    ├── page.tsx                 # Command Center
    ├── dashboard/               # Staff dashboard
    ├── schedule/                # Shift management (DnD)
    ├── inventory/               # Warehouse spreadsheet + InventoryQuickActionFAB
    │   ├── count/               # Stock-taking + count accuracy verification
    │   └── accuracy/            # Accuracy report for exact-count items
    ├── maintenance/             # Equipment tracking
    ├── sales/                   # Sales analytics
    ├── settings/                # Theme picker, login history, passkeys, notification prefs
    └── market-insights/         # AI market analysis (v2)
        └── components/          # ContextPanel, AlertsCard, InsightCharts,
                                 # ActionChecklist, SourcesList, DiffBanner
```

i18n middleware: `src/proxy.ts` (Next.js 16 convention — not `src/middleware.ts`)

---

## 5. Data Flow Patterns

### Inventory Edit (Spreadsheet)

```text
onChange → local state → onBlur → updateInventoryStock() [RPC set_inventory_stock]
→ optimistic update → Supabase realtime merge → all windows sync
```

### Stock-Taking Count + Accuracy Verification (v8.9)

```text
CountInput blur → read inventory_items.stock + count_policy (baseline)
→ updateInventoryStock(recordHistory: false)
→ exact_count: recordCountVerification() → INSERT inventory_count_verifications (system_stock_qty, matched)
→ sufficiency_check: skip accuracy scoring; manual order_qty drives purchase order quantity
→ fetchCountAccuracyStats() / fetchInventoryAccuracyReport() for badges and report page
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
→ Optional backup: Supabase Database Webhook → POST /api/push/webhook (PUSH_WEBHOOK_SECRET)
```

Skips origin device when `client_session_id` matches mutation metadata. Requires `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`; fails gracefully when unset or table missing.

### AI Chat

```text
AIChatOverlay → POST /api/chat → ToolLoopAgent (Gemini 2.5 Flash)
→ tools: getDailyShifts, readTable, internetSearchTool
→ daily schedule queries short-circuit to deterministic stream (no LLM)
→ streaming response → XSS sanitization on display
```

> AI tools (`src/app/api/chat/route.ts`): `getDailyShifts` (daily roster), `readTable` (other internal tables), `internetSearchTool` (external/weather). Weather is served via `internetSearchTool` — there is no separate `weather` AI tool.

### Daily LINE Report

```text
Vercel Cron → /api/daily-report → compileDailyReportPayload()
→ shifts + inventory alerts + weather + holidays → sendLineNotification()
```

---

## 5b. AI Data Access Map (AI-GATEWAY-P3)

Every read the AI layer performs funnels through `src/lib/ai-data-gateway.ts` — the single doorway between the LLM tools and Supabase. This keeps the Service Role client, the DEC-069 column presets, and the `SECURITY DEFINER` RPCs as the only ways the model can touch data.

```text
LLM (Gemini)
  │
  ▼
readTableTool.execute               ← src/app/actions/tools/database-tools.ts (routing + shaping only)
  │
  ├─ inventory_items, no filters ──▶ fetchInventorySummary()  ─▶ rpc('get_ai_store_status')
  │                                                              (view_inventory_summary → LOW/WARNING/OK)
  │
  ├─ shifts + date filter ─────────▶ fetchShiftsByDate(date)  ─▶ fetchDailyShiftsByDate() (DEC-068)
  │
  └─ everything else ──────────────▶ fetchTablePreset(table, filters?, limit?)
                                       └─ admin.from(table).select(PRESET).limit(MAX)
```

### Gateway surface

| Function | Backing source | Returns | Notes |
| --- | :--- | --- | :--- |
| `fetchInventorySummary()` | `rpc('get_ai_store_status')` | `{ inventory_summary, low_stock_items, shifts, timestamp }` | DB computes stock status; no raw column select |
| `fetchShiftsByDate(date)` | `fetchDailyShiftsByDate` | `FormattedDailyShifts` | Canonical grouped roster (front_store / other_duty / off_or_leave) |
| `fetchTablePreset(table, filters?, limit?)` | `admin.from(table).select(PRESET)` | `{ ok, rows, effectiveLimit }` | Only ever selects `TABLE_COLUMN_PRESETS[table]` |

Market Insights also reads store-managed `local_events` through `fetchUpcomingLocalEvents()` and formats them with `buildLocalEventsContext()` before the Gemini prompt. Missing table/query errors fail closed to an empty event list.

### Invariants

- DEC-069 preset lockdown: `fetchTablePreset` ignores any AI-supplied `columns`; it always selects the table preset. Arbitrary column selection (a data-exfiltration vector through the RLS-bypassing Service Role client) is impossible by construction.
- RPC-first for snapshots: broad "store status / low stock" questions resolve through `get_ai_store_status` (`sql/ai_agent_views.sql`) rather than a wide table scan. LOW status uses `stock <= order_point AND target_stock > stock` (migration `20260615130000`). Do not delete `sql/ai_agent_views.sql` — the gateway depends on its views/RPCs.
- Single doorway: `database-tools.ts` no longer owns a Supabase client, presets, aliases, or limits — it routes and shapes only. Add new AI reads to the gateway, never directly in a tool.

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
| Google Gemini | `GOOGLE_GENERATIVE_AI_API_KEY` | AI Chat + Market Insights (`@ai-sdk/google`) |
| OpenWeatherMap | `OPENWEATHER_API_KEY` | Weather widget + daily report |
| Tavily | `TAVILY_API_KEY` | AI web search + Market Insights multi-query cache |
| Google Places | `GOOGLE_PLACES_API_KEY` | Nearby competitor cafes - Market Insights v2 (OPTION) |
| Web Push (VAPID) | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` | Cross-device inventory alerts via `web-push` |
| LINE Messaging API | `LINE_CHANNEL_ACCESS_TOKEN` | Daily push notifications |
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
