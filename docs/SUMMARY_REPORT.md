# Documentation Summary Report

Last Updated: 2026-06-22 | Version: v9.0

---

## Purpose

รายงานสรุปการอัปเดตเอกสารให้สอดคล้องกับโค้ดปัจจุบัน (v9.0 — performance phases, daily report Web Push fields, SQL index)

---

## Files Updated (2026-06-22 v9.0)

| File | Key changes |
| --- | --- |
| `README.md` | Performance posture and shared Web Push subscription scope |
| `PROJECT_MAP.md` | Version/date, 14 migrations, 103 tests, new performance test suites |
| `docs/database.md` | `push_subscriptions.profile_id` / `branch_id`, branch index, migrations `20260620221500` / `20260621120000` |
| `docs/api.md` | Daily report Web Push reference and shared push subscription behavior |
| `docs/architecture.md` | Dashboard query consolidation, inventory grid containment, dynamic modal loading, daily report Web Push data flow |
| `docs/context.md` | Current version and feature highlights for performance phases + daily report Web Push |
| `docs/tasks.md` | Completed Phase 1-3 performance tasks and v9.0 doc sync |
| `docs/changelog.md` | v9.0 performance/doc/SQL sync entry |
| `docs/memory.md` | DEC-078 daily report Web Push subscriptions and DEC-079 performance guardrails |
| `docs/design.md` / `docs/rules.md` | Inventory row containment, dynamic modal loading, dashboard query guardrails, push subscription fields |
| `docs/prd.md` | Dashboard/inventory performance and daily Web Push product scope |
| `SKILLS_INVENTORY.md` | Performance skill entries for dashboard query consolidation, route bundle split, row containment |
| `sql/README.md` | 14 migrations listed; no-safe-delete SQL audit refreshed |

## Files Deleted (2026-06-22 v9.0)

| File | Reason |
| --- | --- |
| None | Documentation sync only; no files were deleted |

## Verification

- `git diff -- README.md PROJECT_MAP.md docs sql` — inspected after edits
- `npm run lint:md` — run after docs edits
