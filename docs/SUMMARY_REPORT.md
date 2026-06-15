# Documentation Summary Report

Last Updated: 2026-06-16 | Version: v8.6

---

## Purpose

รายงานสรุปการอัปเดตเอกสารให้สอดคล้องกับโค้ดปัจจุบัน (v8.6 — count accuracy refactor, AI low-stock alignment, graphify refresh)

---

## Files Updated (2026-06-16 v8.6)

| File | Key changes |
| --- | --- |
| `docs/database.md` | `system_stock_qty` column; migrations 20260615120000 + 20260615130000 |
| `docs/api.md` | `recordCountVerification()` uses system stock baseline; removed obsolete theoretical helpers |
| `docs/architecture.md` | Count flow + `view_inventory_summary` LOW logic |
| `docs/changelog.md` | 2026-06-16 sync entry |
| `docs/memory.md` | DEC-074 (system stock); DEC-073 marked superseded |
| `docs/context.md` | Count accuracy paths |
| `docs/prd.md` | System stock baseline wording |
| `docs/tasks.md` | Count accuracy task updated |
| `sql/README.md` | Two new migrations listed |
| `PROJECT_MAP.md` | 8 migrations, 69 tests, date bump |

## Files Deleted (2026-06-16)

None — SQL audit kept all 21 `.sql` files.

## Graphify

- `graphify update .` run post-change
- Outputs: `graphify-out/graph.json`, `GRAPH_REPORT.md`, `graph.html`

## Verification

- Doc-only sync — no Vitest re-run required
