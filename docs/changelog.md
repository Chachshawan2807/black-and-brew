# Changelog

> Trimmed for agent use. Full history: `git log -- docs/`.

## 2026-07-23 (Doc scan — bean orders + AI full coverage)

- Scanned project-owned `.md` keepers; synced to bean orders module, AI gateway expansion (24 tables), and TrackingMore API routes.
- Added `bean-orders` routes, `bean-order-actions.ts`, and `/api/bean-orders/*` to `PROJECT_MAP.md`, `README.md`, `docs/architecture.md`, `docs/api.md`, `docs/prd.md`.
- Fixed stale `getInventoryItemDetails` references → `getBeanOrdersSummary` + inventory accuracy deterministic routes in `docs/api.md` and `docs/MASTER_BLUEPRINT.md`.
- Added migration `20260722140000_bean_orders.sql` to `docs/database.md` and `sql/README.md`.
- Recorded DEC-084 (bean orders) and DEC-085 (AI full coverage) in `docs/memory.md`.
- Documented `TRACKINGMORE_API_KEY` in README, `docs/context.md`, `docs/MASTER_BLUEPRINT.md`.
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
