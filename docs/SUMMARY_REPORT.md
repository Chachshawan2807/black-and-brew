# Documentation Summary Report

Last Updated: 2026-06-12 | Version: v8.5

---

## Purpose

รายงานสรุปการอัปเดตเอกสารทั้งหมดให้สอดคล้องกับโค้ดปัจจุบัน (v8.5 — security audit + inventory notifications + graphify refresh)

---

## Files Updated (2026-06-12 v8.5)

| File | Key changes |
| --- | --- |
| `README.md` | v8.5, FAB, notification prefs, session revocation, `db:verify` |
| `AGENTS.md` | graphify knowledge-graph section |
| `docs/database.md` | Fixed Thai/encoding corruption; new tables + migrations |
| `docs/architecture.md` | Auth audit flow, inventory notifications, FAB |
| `docs/api.md` | Session revocation, login history, Realtime channels |
| `docs/context.md` | v8.5 features |
| `docs/changelog.md` | v8.5 entry |
| `docs/memory.md` | DEC-071 |
| `docs/tasks.md` | Security + notifications completed |
| `PROJECT_MAP.md` | Migrations, components, test count |
| `docs/design.md`, `docs/rules.md`, `docs/skills.md` | Header v8.5 |
| `docs/MASTER_BLUEPRINT.md`, `SKILLS_INVENTORY.md` | Header v8.5 |
| `docs/refactor-regression-checklist.md` | Table lint fix |

## Graphify

- `graphify update . --force` → **2447 nodes**, **3925 edges**, **147 communities**
- Outputs: `graphify-out/graph.json`, `GRAPH_REPORT.md`, `graph.html`
- No `graphify-out/wiki/index.md` (wiki not generated)

## Verification

- `npm run lint:md` ✓
