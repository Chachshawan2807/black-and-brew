# Changelog

> Trimmed for agent use. Full history: `git log -- docs/`.

## 2026-08-18 (Doc hygiene + completed superpowers cleanup)

- Deleted 10 merged `docs/superpowers/{specs,plans}/2026-07-*` artifacts per `docs/superpowers/README.md` (features shipped; history in `docs/changelog.md` + git).
- Documented `insight-actions.ts` (`refreshProactiveInsightDigest`) in `docs/api.md` and `PROJECT_MAP.md`.
- Synced keepers for Command Center `HomePurchaseOrdersSection.tsx`, grid a11y libs (`*-grid-cell-a11y.ts`, `inventory-grid-cell-blur.ts`), shared `ClickableDatePicker` / `dropdown-menu`, and new Vitest suites.
- `npm run docs:links`: 56 project-owned markdown files, 0 broken links. Orphan scan: 34 false positives (colocated `_components` relative imports) — no `src/` deletions.
- Bumped keeper stamps to 2026-08-18 (product v9.3 unchanged).

## 2026-08-11 (Doc sync + migration index + link validator)

- Documented migrations `20260810160403_insight_notification_realtime.sql`, `20260811105704_inventory_transaction_at.sql`, and `20260811115400_reset_inventory_history_transaction_at.sql` in `docs/database.md` and `sql/README.md`.
- Synced keeper migration filenames to on-disk `supabase/migrations/` timestamps (e.g. `20260722074607_bean_orders.sql`, `20260724170556_harden_rls_and_rpc_execute.sql`, `20260729034015_record_inventory_transaction_old_stock.sql`).
- Synced keepers for `transaction_at` ledger column, `p_transaction_at` RPC param, and navigation prefetch helpers (`warm-route-navigation.ts`, `route-chunk-preload.ts`, `ViewTransitionNavigation.tsx`).
- Added `scripts/validate-md-links.mjs` + `npm run docs:links` — validated 67 project-owned markdown files, 0 broken links.
- Orphan scan (`scripts/scan-dead-imports.mjs`): 34 false positives from colocated `_components` relative imports — no `src/` deletions.
- No `.db`/`.sqlite` artifacts in repo; no `graphify-out/` directory. Third-party `.agents/skills/` left unchanged.
- Bumped keeper stamps to 2026-08-11 (product v9.3 unchanged).

## 2026-08-09 (Doc sync + graphify hook retirement)

- Documented migration `20260729100000_record_inventory_transaction_old_stock.sql` in `docs/database.md` and `sql/README.md` (`old_stock` in `record_inventory_transaction` RPC JSON).
- Replaced graphify guidance in `.codex/hooks.json` with codebase-memory-mcp (`search_graph` / `trace_path`); graphify remains retired per `AGENTS.md`.
- Synced root `MASTER_BLUEPRINT.md` redirect stub to v9.3 / 2026-08-09.
- Removed orphaned dev scripts: `scripts/fix-cursor-default-model.py` (personal Cursor config utility, zero references).
- Validated project-owned markdown links (38 files, 0 broken). Orphan scan: 0 unreferenced `src/` modules.
- Bumped keeper stamps to 2026-08-09 (product v9.3 unchanged).

## 2026-07-28 (Doc hygiene + proven dead-code cleanup)

- Removed dead `trackingWarning` from `shipBeanOrder` return type and bean-order clients (TrackingMore sync is deferred via `after()`).
- Synced `PROJECT_MAP.md`: dropped deleted `daily-report-notification-actions.ts`; added `migrate-inventory-sort-order.ts`; noted `rounded-select` / `view-transition` / related tests.
- Documented migration `20260726153946_drop_service_records_unused_columns.sql` in `docs/database.md` and `sql/README.md`.
- Updated architecture notes: deferred ship TrackingMore, `RoundedSelect`, frequent-items cache.
- Validated project-owned markdown links (37 files, 0 broken). Spec/plan: `docs/superpowers/specs|plans/2026-07-28-docs-deadcode-hygiene*`.
- Bumped keeper stamps to 2026-07-28 (product v9.3 unchanged).

## 2026-07-25 (Doc hygiene + orphan cleanup)

- Removed unused code: `AIChatWrapper.tsx` (superseded by `DeferredOverlays` → `AIChatOverlay`), `src/lib/policies/index.ts` (unused barrel), `scripts/test-bean-delivered-notify.ts` (unreferenced dev script).
- Removed unapplied SQL blueprint `sql/inventory_transactions_readable_view.sql` (never in migrations or app code).
- Fixed `.gitignore`: track `config/vercel-firewall.json` (was blocked by blanket `config/` rule).
- Synced docs to v9.3: proactive insights (`/api/insight-alerts`, `src/lib/proactive-insights/`), migrations `20260724120000` + `20260725120000`, `app_preferences`, Command Center ops panels, RLS audit docs.
- Fixed broken test paths in `docs/superpowers/plans/2026-07-22-bean-orders.md`; updated `docs/performance-baseline.md` (`error.tsx` exists).
- Recorded **DEC-086** (proactive insights) in `docs/memory.md`.

## 2026-07-23 (Doc scan — bean orders + AI full coverage)

- Scanned project-owned `.md` keepers; synced to bean orders module, AI gateway expansion (24 tables), and TrackingMore API routes.
- Added `bean-orders` routes, `bean-order-actions.ts`, and `/api/bean-orders/*` to `PROJECT_MAP.md`, `README.md`, `docs/architecture.md`, `docs/api.md`, `docs/prd.md`.
- Fixed stale `getInventoryItemDetails` references → `getBeanOrdersSummary` + inventory accuracy deterministic routes in `docs/api.md` and `docs/MASTER_BLUEPRINT.md`.
- Added migration `20260722140000_bean_orders.sql` to `docs/database.md` and `sql/README.md`.
- Recorded DEC-084 (bean orders) and DEC-085 (AI full coverage) in `docs/memory.md`.
- Removed TrackingMore integration (API client, webhook, cron sync); bean orders use manual delivery confirm.
- Removed orphaned empty route folder `src/app/[locale]/market-insights/` (Market Insights retired in migration `20260622143800`).
- No `.db`/`.sqlite` files in repo (Supabase migrations only). Third-party `.agents/skills/` left unchanged.

## 2026-07-19 (Doc scan — migration + offline mutation accuracy)

- Scanned 335 `.md` files repo-wide; edited 7 project-owned keepers for factual drift.
- Fixed stale machine-local path in `docs/context.md` (`C:\Projects\black-and-brew`).
- Added missing migration `20260713100000_schedule_daily_report_notifications.sql` to `docs/database.md` and `sql/README.md`; documented schedule daily-report RLS on `data_change_logs`.
- Corrected offline mutation docs: actual kinds are `inventory_field`, `inventory_stock`, `inventory_reorder` (not `transaction`) in `docs/api.md` and `docs/architecture.md`.
- Extended `PROJECT_MAP.md` test index with branch-withdraw and FAB/offline suites.
- No graphify references outside `AGENTS.md` retirement notice; no broken links in project-owned docs; third-party `.agents/skills/` left unchanged.

## 2026-07-13 (DEC-083 — offline mutation + policy gates)

- Recorded **DEC-083** in `docs/memory.md`: inventory offline mutation queue (IndexedDB + SW Background Sync), replay via `POST /api/inventory/offline-mutation`, session binding (`offline-auth-session.ts`), and centralized authz in `src/lib/policies/`.
- Synced DEC-083 into codebase-memory-mcp ADR (`manage_adr`) so agents inherit the same rules across sessions.
- Agents: new mutations must use `gateMutation()` / `requireMutationAccess()` — no ad-hoc read-only checks; inventory-only offline scope (schedule/sales unchanged).

## 2026-07-13 (Doc scan — offline mutation + version sync)

- Scanned all project-owned `.md` files; bumped `docs/rules.md` and `docs/design.md` version headers from 9.1 → 9.2 (date 2026-07-10 → 2026-07-12) to match current release.
- Documented new offline mutation feature: `POST /api/inventory/offline-mutation`, `src/lib/offline-mutation-*`, `src/lib/offline-auth-session.ts`, `src/lib/offline-replay-retry.ts`, `public/offline-mutation-store.js` added to `docs/api.md`, `docs/architecture.md`, `PROJECT_MAP.md`, `README.md`.
- Added `src/workers/` and `src/lib/policies/` to PROJECT_MAP structure.
- No broken path references found; no graphify or weather API remnants.

## 2026-07-12 (Doc scan — branch withdraw + notifications)

- Scanned 337 `.md` files repo-wide; edited 12 project-owned keepers for factual drift.
- Added Branch Withdraw (`/[locale]/inventory/branch-withdraw`), `branch-withdraw-actions.ts`, `inventory_branch_withdrawals`, and related migrations/RPC to README, PROJECT_MAP, architecture, api, database, PRD, blueprint, context.
- Documented notification unread-badge counter libs and accuracy gauge paths.
- No Graphify references found outside `AGENTS.md` retirement notice. Third-party `.agents/skills/` left unchanged.

## 2026-07-10 (Markdown docs hygiene)

- Scanned project-owned `.md` files; no Graphify docs remained to delete (already retired).
- Synced keepers to current App Router + Supabase layout: API routes (`chat`, `daily-report`, `push/webhook`), SQL under `sql/` + `supabase/migrations/`, Tavily-only AI search.
- Fixed broken / machine-local links (e.g. `AGENTS.md` → `docs/SOP.md`); removed weather leftovers from PRD; documented `data-change-log-actions.ts` in `docs/api.md`.
- Tightened blueprint / skills / changelog noise; canonical protocols remain in `docs/rules.md`, skills in `docs/skills.md`, risk R0/R1/R2 in `AGENTS.md`.

## 2026-07-10 (Supabase Advisors — views + search_path)

- Applied `20260710162206_harden_security_definer_views_and_search_path.sql` on remote.
- `view_today_shifts` / `view_inventory_summary` → `security_invoker = true`.
- Locked `search_path = public` on inventory/AI RPCs and triggers.

## 2026-07-10 (Doc merge + weather removal)

- Merged former root skill/protocol stubs into `docs/skills.md`, `docs/rules.md`, and `AGENTS.md`; historical SQL → `sql/historical/`.
- Removed OpenWeatherMap `/api/weather` and related AI weather intent; AI search is Tavily-only.

## 2026-07-08 (Structure sync v9.1)

- App Router `_components` colocation; codebase-memory-mcp as primary knowledge graph.
- Retired inventory recommended target stock and obsolete completed plans/reports.

## 2026-06-22 (Performance + Web Push v9.0)

- Dashboard overlapping shift-query consolidation; inventory row containment + dynamic modals.
- `push_subscriptions.profile_id` / `branch_id` for daily schedule reports.

## 2026-06-19 (Inventory count policy v8.9)

- `inventory_items.count_policy` (`exact_count` / `sufficiency_check`).
- `/[locale]/inventory/accuracy` for exact-count items only.
