# Memory Log — BLACKANDBREW ERP

> Version: 9.2 | Last Updated: 2026-07-23 | Purpose: Recent architecture decisions agents must not undo

Older decisions live in git history and `docs/changelog.md` (trimmed). Query **codebase-memory-mcp** (`search_graph`, `trace_path`) before broad file reads.

---

## Active Decisions

### DEC-085: AI Bru Full Coverage + Bean Order Gateway (v9.2)

- Date: July 2026
- Context: บรูต้องตอบคำถามออเดอร์เมล็ดกาแฟและความแม่นยำคลังได้แบบ deterministic โดยไม่พึ่ง LLM เดา; ขยาย AI-readable tables เป็น 24 ตาราง
- Decision:
  1. **Gateway:** `fetchBeanOrdersSummary()`, `fetchInventoryAccuracySummary()` in `ai-data-gateway.ts`; bean `bean_*` tables in `AI_ALLOWED_TABLES` with PII-safe presets.
  2. **Deterministic routes:** `detect-bean-orders-query.ts`, `detect-inventory-accuracy-query.ts` → Bru report SSE (no LLM).
  3. **Tool surface:** `getBeanOrdersSummary` in `database-tools.ts`; removed stale `getInventoryItemDetails` from chat tools.
  4. **Intent classifier:** weighted scores route to tool subset + deterministic short-circuits.
- Impact: `/api/chat` hot-path covers schedule, maintenance, sales, holidays, low-stock, store status, bean orders, inventory accuracy.
- Evidence: `ai-data-gateway.test.ts`, `ai-deterministic-routes.test.ts`, `ai-bean-orders-gateway.test.ts`, `format-bean-orders-chat-response.ts`, `format-inventory-accuracy-chat-response.ts`

### DEC-084: Bean Orders Module (v9.2)

- Date: July 2026
- Context: Staff need a dedicated workflow for coffee bean orders with payment slips, shipping, and TrackingMore — separate from inventory stock deduction.
- Decision:
  1. Route: `src/app/[locale]/bean-orders/` with list, create, detail, edit pages.
  2. Tables: `bean_customers`, `bean_customer_addresses`, `bean_orders`, `bean_order_lines`, `bean_order_payments`, `bean_order_shipments` (`20260722140000_bean_orders.sql`).
  3. Mutations: `bean-order-actions.ts`; domain logic in `src/lib/bean-orders/`.
  4. Tracking: `POST /api/bean-orders/tracking-webhook`, `GET /api/bean-orders/sync-tracking` (CRON_SECRET); `TRACKINGMORE_API_KEY`.
  5. Storage: `bean-order-slips` bucket; dual-axis status (`payment_status` × `fulfillment_status`).
- Impact: Sidebar link in `menu-list.ts`; audit via `recordDataChange(module=bean_orders)`; no inventory stock auto-deduction.
- Evidence: `bean-orders-*.test.ts`, `docs/superpowers/specs/2026-07-22-bean-orders-design.md`

### DEC-083: Offline Inventory Mutation Queue + Policy Gates (v9.2)

- Date: July 2026
- Context: Staff on unstable Wi‑Fi must keep editing the inventory spreadsheet; mutations must not bypass PIN/read-only auth or replay under a different session after reconnect.
- Decision:
  1. **Client queue:** IndexedDB store (`offline-mutation-queue.ts`) + SW mirror (`public/offline-mutation-store.js`); coalesce field edits per item/field; flush on `online` and Background Sync tag `bb-offline-mutations`.
  2. **Replay API:** `POST /api/inventory/offline-mutation` validates Zod payloads (`inventory_field`, `inventory_stock`, `inventory_reorder`) and calls `replayOfflineMutation()` — same server paths as live edits.
  3. **Session binding:** `offline-auth-session.ts` stamps `authSessionId` on enqueue; route rejects replay when cookie `OFFLINE_AUTH_SESSION_COOKIE` mismatches (logout clears queue via `logout-client.ts`).
  4. **Policy gates:** `src/lib/policies/` — `evaluateAuthz()` in `authz.ts`; server entry points use `server-gate.ts` (`requireMutationAccess`, `gateMutation`, `requirePinMutationAccess`). Do not add ad-hoc read-only checks in actions/routes.
- Impact:
  - Inventory blur/Enter saves may queue when offline; UI stays optimistic; SW replays when online.
  - Server Actions and the offline route share one authz model — read-only PIN cannot mutate via either path.
  - New inventory mutation surfaces must call `gateMutation()` / `requireMutationAccess()`, not duplicate `assertWritableSession` logic.
  - Documented in `docs/api.md`, `docs/architecture.md`, MCP ADR; graph indexed under offline-mutation + policies clusters.
- Evidence: `offline-mutation-*.ts`, `public/sw.js`, `src/app/api/inventory/offline-mutation/route.ts`, `src/lib/policies/`, `offline-mutation-route.test.ts`, `policies-authz.test.ts`, `offline-mutation-sync.test.ts`

### DEC-082: Branch 2 Withdrawal Batch (v9.2)

- Date: July 2026
- Context: Staff withdraw stock to branch 2 via spreadsheet-style grid; must atomically IN stock and keep LINE-formatted audit history.
- Decision:
  1. Route: `src/app/[locale]/inventory/branch-withdraw/` with `BranchWithdrawClient.tsx`.
  2. Mutations: `branch-withdraw-actions.ts` → `record_branch_withdrawal_batch` RPC (blueprint in `sql/record_branch_withdrawal_batch.sql`).
  3. Header table: `inventory_branch_withdrawals`; draft in `sessionStorage` key `inventory-branch-withdraw-draft:v1`.
- Impact: Sidebar link in `menu-list.ts`; inventory notifications via `recordDataChange()`.
- Evidence: `supabase/migrations/20260711120000_inventory_branch_withdrawals.sql`, `inventory-branch-withdraw-format.test.ts`

### DEC-080: Feature `_components` Colocation (v9.1)

- Date: July 2026
- Context: Shared `src/components/` grew with feature-only UI; agents confused route vs shared boundaries.
- Decision:
  1. Feature-only UI → `src/app/[locale]/<feature>/_components/` (private folder, not a URL segment).
  2. Cross-feature UI stays in `src/components/` (auth, sidebar, ui, ai, notifications).
  3. Domain logic stays in `src/lib/` or `src/lib/<domain>/`; mutations in `src/app/actions/`.
  4. No drive-by moves — colocate new code only; promote to shared when used by 2+ features.
- Impact: `AGENTS.md` is canonical for structure; `PROJECT_MAP.md` and README architecture reflect `_components` paths.
- Evidence: `src/app/[locale]/dashboard/_components/`, `src/app/[locale]/inventory/_components/`, `src/app/[locale]/settings/_components/`

### DEC-081: Retired Features — Do Not Reintroduce (v9.1)

- Date: July 2026
- Do not reintroduce:
  1. Graphify (or any second knowledge-graph toolchain) — use **codebase-memory-mcp** only.
  2. Inventory recommended target stock — dropped by `20260708104230_remove_inventory_recommended_target_stock.sql`.
  3. Dashboard widgets: WeatherWidget, InventorySummaryCard, CommandCenterGrid.
  4. Weather forecasting (`/api/weather` / OpenWeatherMap) — AI external search is Tavily-only.
  5. Market Insights module (`local_events`, `market_insight_runs`) — dropped by `20260622143800_drop_market_insights_tables.sql`.
- Impact: Keep docs and code free of these as active features.

### DEC-079: Phased Performance Refactor Guardrails (v9.0)

- Dashboard may consolidate overlapping week/month `shifts` queries only when split back into original payloads.
- Inventory grid optimizations must preserve inline `<input>` cells, blur/Enter save, zero-display, undo, and realtime.
- Heavy modals may use `next/dynamic` + intent preload without changing visible behavior.
- Evidence: `dashboard-data.ts`, `inventory-grid-performance.test.ts`, `bundle-route-loading.test.ts`

### DEC-078: Daily Schedule Reports Reuse Web Push Subscriptions (v9.0)

- `push_subscriptions` extended with `profile_id` and `branch_id` (`main` default).
- Inventory alerts and daily reports share one subscription lifecycle.
- Evidence: `20260621120000_push_subscriptions_daily_report.sql`, `daily-report-web-push.ts`

### DEC-076: Inventory Count Policy Split (v8.9)

- `count_policy`: `exact_count` (accuracy scoring) vs `sufficiency_check` (manual `order_qty`, no accuracy).
- Evidence: `20260618163100_inventory_count_policy.sql`, `inventory_count_policy.test.ts`

### DEC-075: Cross-Device Web Push for Inventory Alerts (v8.7)

- `push_subscriptions` + `PushSubscriptionManager` + `dispatchInventoryWebPush()` after `data_change_logs`.
- Evidence: `20260616120000_push_subscriptions.sql`, `web-push.ts`

### DEC-074: Count Accuracy Uses System Stock Baseline (v8.6)

- `inventory_count_verifications.system_stock_qty` vs physical count at verification time.
- Evidence: `20260615120000_inventory_count_accuracy_refactor.sql`

### DEC-070: Dual Theme + Pastel Surface Pattern (v8.4)

- Theme tokens on standard surfaces; `bb-pastel-surface` on time-based pastel cards.
- Evidence: `globals.css`, `shift-colors.ts`, `docs/design.md`

### DEC-068: Deterministic AI Daily Schedule Response (v8.1)

- `/api/chat` short-circuits daily schedule queries via `src/lib/schedule/*` — no LLM guesswork.
- Evidence: `schedule_chat_response.test.ts`, `format_daily_shifts.test.ts`

### DEC-062: Inventory Stock Single Source of Truth (v6.8)

- All stock writes via `updateInventoryStock()` → RPC `set_inventory_stock`.
- Realtime merge via `mergeInventoryRealtimeUpdate()` — never replace full row from partial payload.
- Evidence: `inventory-stock.ts`, `inventory_stock_sync.test.ts`
