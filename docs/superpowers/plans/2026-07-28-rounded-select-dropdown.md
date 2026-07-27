# Rounded Select Dropdown — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Shared date-picker-like `<select>` styling across the project, excluding all schedule selects/modals.

**Spec:** `docs/superpowers/specs/2026-07-28-rounded-select-dropdown-design.md`

**Tech:** Tailwind class token + thin `RoundedSelect` wrapper in `src/components/ui/`. Native `<select>` only.

---

### Task 1: Shared token + wrapper (TDD)

**Files:**
- Create: `src/components/ui/rounded-select.tsx`
- Create: `src/test/rounded-select.test.ts`

**Steps:**
1. Write failing test asserting `BB_SELECT_TRIGGER_CLASS` includes `rounded-3xl`, `h-11`, `bb-shadow-sm`, `appearance-none`, and that schedule files must NOT import `RoundedSelect`.
2. Implement token + `RoundedSelect` (relative wrapper, select, ChevronDown).
3. Run test → green.

### Task 2: Migrate call sites (exclude schedule)

**Files:**
- Modify: `BeanOrderSelect.tsx`, `bean-order-layout.ts`, `BeanOrdersClient.tsx`
- Modify: `MonthlyRoster.tsx` (+ keep `w-fit` for existing test)
- Modify: `SalesClient.tsx` category filter
- Modify: `MaintenanceModals.tsx` task-type trigger (align to token)
- Do **not** touch: `ScheduleClient.tsx`, `ShiftSettingsModal.tsx`

**Steps:**
1. Point bean-order select styles at shared token / use `RoundedSelect`.
2. Replace other in-scope selects with `RoundedSelect` or shared class + chevron.
3. Run `smooth-overflow-mobile` MonthlyRoster assertion + new rounded-select tests.

### Task 3: Verify

- Confirm schedule sources still have no `RoundedSelect` / `BB_SELECT_TRIGGER` imports.
- Spot-check: sales filter, bean-orders filters, dashboard staff select look pill-shaped; schedule unchanged.
