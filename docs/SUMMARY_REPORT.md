# Documentation Summary Report

Last Updated: 2026-06-15 | Version: v8.6

---

## Purpose

รายงานสรุปการอัปเดตเอกสารทั้งหมดให้สอดคล้องกับโค้ดปัจจุบัน (v8.6 — count accuracy, quick action bulk, tooltips, PWA icons, SQL/doc cleanup)

---

## Files Updated (2026-06-15 v8.6)

| File | Key changes |
| --- | --- |
| `sql/record_inventory_transaction.sql` | **Created** — RPC reference blueprint |
| `sql/README.md` | Removed apply-pending-migrations; added blueprint + migration 20260614120000 |
| `docs/database.md` | `inventory_count_verifications` table; full migration list; RPC source paths |
| `docs/api.md` | Count verification, IN/OUT theoretical, bulk transactions; `p_record_history` |
| `docs/architecture.md` | InventoryRealtimeContext, inventory-quick-* libs, count flow, tooltips, supabase-server |
| `docs/changelog.md` | v8.6 entry |
| `docs/tasks.md` | Phase 7 count accuracy + quick action + SQL cleanup completed |
| `docs/prd.md` | DataChangeHistorySection, count accuracy, Market Insights v2 |
| `docs/MASTER_BLUEPRINT.md` | PWA theme colors + icon paths |
| `PROJECT_MAP.md` | 58 tests, new libs/components, migrations |
| `docs/context.md` | v8.6 features |
| `docs/memory.md` | DEC-072, DEC-073 |
| `README.md` | PWA manifest paths and theme colors |
| `docs/design.md` | HintTooltip/AppTooltipProvider, PWA manifest section |
| `docs/refactor-regression-checklist.md` | Count verification, tooltips, quick bulk smoke tests |

## Files Deleted (2026-06-15)

11 legacy SQL files removed after RPC extraction (see changelog v8.6).

## Graphify

- `graphify update .` run post-change
- Outputs: `graphify-out/graph.json`, `GRAPH_REPORT.md`, `graph.html`

## Verification

- Targeted Vitest: inventory count accuracy + quick action suites
