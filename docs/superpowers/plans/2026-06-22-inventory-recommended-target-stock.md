# Inventory Recommended Target Stock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build assisted recommended target stock for inventory items without changing the inventory table layout or adding columns.

**Architecture:** Put deterministic forecast math in a small shared library, fetch forecast inputs in server actions, and keep UI changes scoped to the existing `target_stock` cell. Store manual per-item settings on `inventory_items` so realtime row merges continue to work.

**Tech Stack:** Next.js App Router, React client components, Supabase/Postgres migrations, Vitest.

---

### Task 1: Forecast Math Library

**Files:**
- Create: `src/lib/inventory-recommended-target-stock.ts`
- Test: `src/test/inventory-recommended-target-stock.test.ts`

- [ ] Write failing Vitest tests for display threshold, risk buffer, lead time buffer, holiday buffer, abnormal OUT filtering, and confidence.
- [ ] Run `npm test -- src/test/inventory-recommended-target-stock.test.ts` and verify RED.
- [ ] Implement deterministic helpers and types.
- [ ] Run the same test and verify GREEN.

### Task 2: Supabase Schema And Types

**Files:**
- Create: `supabase/migrations/<generated>_inventory_recommended_target_stock.sql`
- Modify: `src/lib/database.types.ts`
- Modify: `src/lib/inventory-queries.ts`
- Modify: `src/app/[locale]/inventory/types.ts`
- Test: `src/test/inventory_recommended_target_stock_schema.test.ts`

- [ ] Write failing schema/type tests for `shortage_risk`, `lead_time_days`, and select coverage.
- [ ] Generate migration with `supabase migration new inventory_recommended_target_stock`.
- [ ] Add nullable/defaulted settings columns and a `shortage_risk` check constraint for `normal`, `medium`, `high`.
- [ ] Update generated TypeScript type file manually to match migration.
- [ ] Update inventory select constants and client item types.
- [ ] Run targeted schema/type tests and verify GREEN.

### Task 3: Server Action Forecast Fetch

**Files:**
- Modify: `src/app/actions/inventory-actions.ts`
- Test: `src/test/inventory_recommended_target_stock_actions.test.ts`

- [ ] Write failing tests that inspect for a dedicated forecast action querying OUT transactions and holidays.
- [ ] Add action returning recommendation rows keyed by item id.
- [ ] Keep auth and Supabase error logging consistent with existing actions.
- [ ] Run targeted tests and verify GREEN.

### Task 4: Existing Cell UI Integration

**Files:**
- Modify: `src/app/[locale]/inventory/InventoryClient.tsx`
- Test: `src/test/inventory_recommended_target_stock_ui.test.ts`

- [ ] Write failing UI source tests for `target_stock` compact display, a small detail button, and no new inventory column.
- [ ] Fetch recommendation data after inventory load and merge into local row state.
- [ ] Render `20 → 28` inside the existing `target_stock` cell only when threshold passes.
- [ ] Add a small button in the same cell that opens per-item controls for risk, lead time, explanation, and applying the recommended value.
- [ ] Save risk/lead time/target stock through the existing `handleSaveField` path.
- [ ] Run targeted UI tests and verify GREEN.

### Task 5: Verification

**Files:**
- Modified files above.

- [ ] Run targeted Vitest files.
- [ ] Run `npm test -- src/test/inventory-recommended-target-stock.test.ts src/test/inventory_recommended_target_stock_schema.test.ts src/test/inventory_recommended_target_stock_actions.test.ts src/test/inventory_recommended_target_stock_ui.test.ts`.
- [ ] Run lints for edited files with Cursor lints.
