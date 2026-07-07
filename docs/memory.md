# Memory Log — BLACKANDBREW ERP

> Version: 9.1 | Last Updated: 2026-07-08 | Purpose: Recent architecture decisions agents must not undo

Older decisions live in git history and `docs/changelog.md` (trimmed). Query **codebase-memory-mcp** (`search_graph`, `trace_path`) before broad file reads.

---

## Active Decisions

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
- Removed from app and docs:
  1. **graphify** — not used; primary knowledge graph is **codebase-memory-mcp** (see `AGENTS.md`).
  2. **Inventory recommended target stock** — removed by `supabase/migrations/20260707100000_remove_inventory_recommended_target_stock.sql`.
  3. **Market Insights** — route/actions/UI removed; tables dropped by `20260622143800_drop_market_insights_tables.sql`.
  4. **WeatherWidget**, **InventorySummaryCard**, **CommandCenterGrid** — removed from dashboard/command center UI.
- Impact: Do not document or implement these as active features.

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
