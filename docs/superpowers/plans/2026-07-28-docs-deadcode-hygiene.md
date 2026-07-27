# Docs + Proven Dead-Code Hygiene Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax. Spec: `docs/superpowers/specs/2026-07-28-docs-deadcode-hygiene-design.md`

**Goal:** Sync project-owned docs to disk reality; remove proven dead `trackingWarning` surface; log the pass.

**Architecture:** Documentation-only keepers + minimal TypeScript cleanup. No schema changes.

---

## Task 1: Remove dead `trackingWarning` surface

**Files:**
- Modify: `src/app/actions/bean-order-actions.ts`
- Modify: `src/app/[locale]/bean-orders/BeanOrderDetailClient.tsx`
- Modify: `src/app/[locale]/bean-orders/BeanOrderFormClient.tsx`
- Test: extend or add assertion in existing bean-orders ship tests if present

- [x] Strip `trackingWarning?` from `shipBeanOrder` return type
- [x] Remove client reads of `result.trackingWarning` / `shipResult.trackingWarning`
- [x] Run related Vitest if any

## Task 2: Sync maps and SQL indexes

**Files:**
- Modify: `PROJECT_MAP.md` (drop deleted action; add `migrate-inventory-sort-order.ts`; refresh date; optional shared UI notes)
- Modify: `sql/README.md` + `docs/database.md` (add `20260726153946_drop_service_records_unused_columns.sql`)

## Task 3: Validate paths + sync keepers

**Files:**
- Scan project-owned `.md` for broken relative paths
- Update stamps / brief notes in `docs/architecture.md`, `docs/tasks.md`, `docs/memory.md`, `docs/MASTER_BLUEPRINT.md`, `README.md` only where factually drifted
- Prepend `docs/changelog.md` entry for 2026-07-28

## Task 4: Optional graphify hook hygiene

- [x] If `.codex/hooks.json` still injects graphify advice despite absent `graphify-out`, leave as no-op OR document — prefer leave (already gated on file existence)
