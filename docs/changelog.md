# Changelog

> Trimmed for agent use. Full history: `git log -- docs/`.

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
