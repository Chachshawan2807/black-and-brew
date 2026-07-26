# Inventory History Page-Cache + Warmer Prefetch — Design

**Date:** 2026-07-26  
**Status:** Approved (user: approach 1, proceed without further gates)

## Problem

Staff feel the inventory **ประวัติ** modal is slow when:

1. Opening (first page for รับเข้า / นำออก / ปรับจำนวน)
2. Switching type tabs or searching by item name

## Goals

- Instant paint from in-memory page cache when reopening or switching filters.
- Stale-while-revalidate: show cache, refresh in background when stale.
- Warmer prefetch for `ALL` and type filters (`IN` / `OUT` / `ADJUST`) so tab switches hit cache.
- FAB / quick panel warms history before open (not only desktop hover).
- Invalidate all cached pages after inventory mutations that call `refreshHistory`.

## Non-goals

- Cookies / localStorage for transaction history (too large; freshness risk).
- Caching the live inventory stock grid.
- Schema migrations / DB indexes (follow-up if still slow after measure).
- Realtime subscription on `inventory_transactions`.

## Approach

Keyed in-memory cache in `src/lib/inventory-history-prefetch.ts` (extend existing module):

| Concern | Behavior |
|---------|----------|
| Key | `type` + normalized search query (`ALL\|`, `IN\|`, `OUT\|coffee`) |
| Entry | `{ data, hasMore, savedAt }` first page only (offset 0) |
| Fresh TTL | 30s — skip network if fresh |
| Stale | Still show entry; background refetch |
| Invalidate | Clear all keys on mutation refresh |

### Hook (`useInventoryHistory`)

1. On modal open / filter / search change: sync-read cache → set rows immediately if present.
2. If fresh → stop; else fetch and update cache + UI (`isHistoryRefreshing` when rows already shown).
3. When modal opens on `ALL` with empty search: idle-warm prefetch `IN`, `OUT`, `ADJUST`.
4. Keep existing debounce for search (200ms).

### Warmers

- Desktop: keep hover/focus preload on ประวัติ button.
- FAB: start `prefetchInventoryHistoryFirstPage` when quick panel opens.
- `prefetchInventoryHistoryFirstPage` remains public API for `ALL` empty search.

## Error handling

- Failed background refresh: keep stale rows; log error (existing pattern).
- Invalidate + explicit refresh still force network.

## Testing

- Unit: cache key, get/set, fresh vs stale, invalidate, prefetch dedupe.
- Hook wiring (source/contract tests): uses cache before fetch; warms filters; FAB prefetches on panel open.
- Regression: existing history loading / adjust tests stay green.
