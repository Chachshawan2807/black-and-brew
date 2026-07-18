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

## Post-optimization (2026-07-18)

| Change | Effect |
|--------|--------|
| SW stale-while-revalidate for `/_next/static/` + fonts/images | Repeat PWA opens load JS/CSS from disk instantly |
| Idle route prefetch (`inventory`, `schedule`, `dashboard`) | Sidebar taps start with warmed chunks |
| Nav `onTouchStart` + `prefetch` on links | Mobile PWA navigation feels instant |
| Deferred SW registration + realtime subscribe | Less main-thread work during first paint |
| Trimmed Google Font weights | Smaller font payload |
| `optimizePackageImports` for recharts + radix | Smaller route bundles |
| Layout Suspense uses `RouteLoadingSkeleton` | No blank shell during RSC streaming |
| Settings lazy sections | History/login/passkey chunks load only when expanded |
| View Transitions API | Native cross-fade on in-app navigation (Chrome/Safari 18+) |

## Targets

- LCP &lt; 2.5s mobile on main routes
- INP &lt; 200ms
- Immediate skeleton on navigation (no blank shell)
- Inventory cell edit → Supabase sync unchanged (regression check)

## After each phase

Re-run `npm test`, `npm run build`, and spot-check Lighthouse on `/th/inventory`.

