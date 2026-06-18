# Documentation Summary Report

Last Updated: 2026-06-19 | Version: v8.9

---

## Purpose

รายงานสรุปการอัปเดตเอกสารให้สอดคล้องกับโค้ดปัจจุบัน (v8.9 — inventory count policy, local events, route/migration/test count sync)

---

## Files Updated (2026-06-19 v8.9)

| File | Key changes |
| --- | --- |
| `README.md` | Inventory count policy, accuracy route, Market Insights local events context |
| `docs/database.md` | `count_policy`, `local_events`, indexes, migrations `20260618163100` / `20260618175951` |
| `docs/api.md` | `updateInventoryItemField`, `fetchInventoryAccuracyReport`, local event fetch/context, count policy behavior |
| `docs/architecture.md` | Inventory accuracy route, count-policy data flow, local events in Market Insights |
| `docs/context.md` | Current version, runtime wording, theme-token wording, feature highlights |
| `docs/tasks.md` | v8.9 completed work; database types marked complete |
| `docs/changelog.md` | v8.9 documentation sync entry |
| `docs/memory.md` | DEC-076 count policy and DEC-077 local events |
| `docs/design.md` / `docs/rules.md` | Count-policy UI/rules and updated headers |
| `docs/MASTER_BLUEPRINT.md` / `MASTER_BLUEPRINT.md` | v8.9 header and module/data-integrity references |
| `sql/README.md` | 12 migrations listed; count-policy/local-events migrations added |
| `PROJECT_MAP.md` | Inventory accuracy route, 12 migrations, 95 tests |

## Files Deleted (2026-06-19 v8.9)

| File | Reason |
| --- | --- |
| None | Documentation-only sync; no files were deleted |

## Graphify

- `graphify query "what markdown documentation is outdated relative to the current codebase and project structure?"` was run before edits.
- `graphify update .` completed and regenerated `graphify-out/graph.json`, `graphify-out/graph.html`, and `graphify-out/GRAPH_REPORT.md`.
- Graphify reported: code graph updated; for semantic doc/paper/image changes, run `/graphify --update` from an AI assistant flow.

## Verification

- `git diff -- *.md` — inspected after edits
- `npm run lint:md` — passed with 0 errors
- `graphify update .` — passed; see Graphify note above
