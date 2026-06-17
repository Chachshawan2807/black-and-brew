# Documentation Summary Report

Last Updated: 2026-06-17 | Version: v8.8

---

## Purpose

รายงานสรุปการอัปเดตเอกสารให้สอดคล้องกับโค้ดปัจจุบัน (v8.8 — trusted-device passkeys, SQL reference sync, graphify refresh)

---

## Files Updated (2026-06-17 v8.8)

| File | Key changes |
| --- | --- |
| `README.md` | Trusted-device passkeys, WebAuthn env vars, Settings description |
| `docs/database.md` | `device_passkeys` table, indexes, migration `20260617120000` |
| `docs/api.md` | `passkey-actions.ts` section and WebAuthn action surface |
| `docs/architecture.md` | PIN-to-passkey registration/login flow and `device_passkeys` storage |
| `docs/context.md` | Current version, passkey env vars, Settings/auth context |
| `docs/tasks.md` | Legacy SQL references reworded as historical; passkeys marked complete |
| `docs/MASTER_BLUEPRINT.md` | Trusted-device passkeys and WebAuthn env vars |
| `sql/README.md` | Migration `20260617120000` listed; SQL cleanup audit result |
| `PROJECT_MAP.md` | 10 migrations, 94 tests, passkey actions/components |
| `DB_SCHEMA.sql` | Current profiles fields and authenticated RLS reference |
| `sql/ai_agent_views.sql` | Missing AI views added for current Market Insights references |
| `src/lib/database.types.ts` | Added `device_passkeys`, `inventory_count_verifications`, and `market_insight_runs` table types |

## Files Deleted (2026-06-17 v8.8)

| File | Reason |
| --- | --- |
| None | SQL audit found no safe deletion candidates; all 22 SQL files are migration history, active references, or optional current feature schema |

## Graphify

- `graphify update .` refused overwrite because existing graph had more nodes; reran `graphify update . --force`
- Outputs updated: `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`, `graphify-out/graph.html`
- Stats: 7669 nodes, 12589 edges, 591 communities
- `graph.html` generated as an aggregated community view because the graph exceeds the 5000-node visualization limit

## Verification

- `npm run lint:md` — passed
- `npm run db:verify` — passed; includes `device_passkeys`
- `npm run lint` — failed on pre-existing test lint errors outside edited files (`no-explicit-any`, `require()` imports); IDE lints on edited files are clean
