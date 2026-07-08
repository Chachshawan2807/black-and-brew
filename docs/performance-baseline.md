# Performance Baseline — BLACKANDBREW ERP

Recorded before loading-performance optimization work (2026-07-08).

## How to reproduce

```bash
npm run build          # chunk sizes in build output
npm run analyze        # webpack bundle analyzer (ANALYZE=true)
```

Lighthouse (mobile + desktop): `/th`, `/th/inventory`, `/th/schedule`, `/th/sales`

DevTools → Network → filter RSC/flight for payload size.

## Pre-optimization observations

| Area | Finding |
|------|---------|
| Global shell | PinGateway, SidebarLayout, NotificationProvider, FAB, AI chat on every route |
| Route chunks | ScheduleClient / InventoryClient / SalesClient ~600–2000 lines, eager in page.tsx |
| RSC payload | Sales `getSalesMetrics` loads all `sales_records`; inventory/maintenance full tables |
| Waterfalls | `fetchAndPersistHolidays` on schedule critical path; `fetchCountAccuracyStats` sequential |
| Loading UX | 6/10 routes have `loading.tsx`; no `error.tsx` |
| Realtime | Inventory notifications subscribe on every route at mount |

## Targets (post-optimization)

- LCP &lt; 2.5s mobile on main routes
- INP &lt; 200ms
- Immediate skeleton on navigation (no blank shell)
- Inventory cell edit → Supabase sync unchanged (regression check)

## After each phase

Re-run `npm test`, `npm run build`, and spot-check Lighthouse on `/th/inventory`.
