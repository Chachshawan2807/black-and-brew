# Inventory History Page-Cache Implementation Plan

> **For agentic workers:** Implement task-by-task with TDD. Steps use checkbox syntax.

**Goal:** Make inventory history modal open and filter/search feel instant via keyed client page-cache + warmer prefetch.

**Architecture:** Extend `inventory-history-prefetch.ts` into a keyed first-page cache with SWR; wire `useInventoryHistory` + FAB panel open; invalidate on existing `refreshHistory` path.

**Tech Stack:** Vitest, existing `fetchTransactionHistory` Server Action, React hook.

## Global Constraints

- No schema migrations
- Do not cache inventory stock grid
- No cookies/localStorage for history rows
- Preserve ERP freshness: invalidate after mutations

---

## Task 1: Page-cache module + unit tests

**Files:**
- Modify `src/lib/inventory-history-prefetch.ts`
- Create/update `src/test/inventory-history-page-cache.test.ts`

- [x] Failing tests: key, set/get, fresh TTL 30s, stale still readable, invalidate clears all, prefetch dedupe per key
- [x] Implement cache + keep `prefetchInventoryHistoryFirstPage` / `invalidateInventoryHistoryPrefetch` APIs
- [x] Tests green

## Task 2: Hook SWR + filter warm

**Files:**
- Modify `src/hooks/use-inventory-history.ts`
- Update `src/test/inventory-history-loading.test.ts`

- [x] Failing contract tests for cache-first + warm IN/OUT/ADJUST
- [x] Implement sync cache paint + background refresh; warm filters on open
- [x] Tests green

## Task 3: FAB warmer

**Files:**
- Modify `src/app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx`
- Update FAB/history tests as needed

- [x] Prefetch ALL when quick panel opens
- [x] Tests green

## Task 4: Verify

- [x] Run targeted vitest for history cache/loading/FAB/adjust
