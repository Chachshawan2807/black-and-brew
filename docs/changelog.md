# Changelog

> Trimmed for agent use. Full history: `git log -- docs/`.

## 2026-07-08 (Doc hygiene + structure sync v9.1)

- Removed obsolete docs: superpowers recommended-target-stock plans/specs, completed `docs/plans/*`, `docs/SUMMARY_REPORT.md`, `VERIFICATION_REPORT.md`.
- Updated project docs for App Router `_components` colocation, codebase-memory-mcp (not graphify), and retired features (recommended target stock, WeatherWidget).
- Trimmed `docs/memory.md` and this changelog to reduce agent context noise.

## 2026-06-22 (Performance phases + doc sync v9.0)

- Dashboard: `getDashboardShiftQueryPlan()` consolidates overlapping week/month shift queries.
- Inventory: row containment, stable handlers, dynamic modal loading with intent preload.
- Web Push: `push_subscriptions.profile_id` / `branch_id` for daily schedule reports.
- Docs synced across README, PROJECT_MAP, architecture, database, api, context, tasks, memory.

## 2026-06-19 (Inventory count policy + local events v8.9)

- `inventory_items.count_policy` (`exact_count` / `sufficiency_check`).
- `/[locale]/inventory/accuracy` for exact-count items only.
