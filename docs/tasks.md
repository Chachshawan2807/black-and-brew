# Tasks — BLACKANDBREW ERP

> Version: 9.3 | Last Updated: 2026-08-09

---

## Completed (summary)

Core ERP modules are shipped: Command Center, Dashboard, Schedule (DnD), Inventory (spreadsheet + count + accuracy), Maintenance, Sales, Settings, AI Chat, PWA, PIN auth + passkeys, Web Push (inventory + daily report).

Notable completed work:

- [x] Inventory stock single source of truth (`set_inventory_stock` RPC, realtime merge)
- [x] Count policy (`exact_count` / `sufficiency_check`) + accuracy report
- [x] Cross-device Web Push + daily report on shared `push_subscriptions`
- [x] Dark theme (`next-themes`, CSS tokens, `bb-pastel-surface`)
- [x] Feature `_components` colocation (dashboard, inventory, schedule, settings, sales, maintenance)
- [x] Performance phases: dashboard query consolidation, inventory row containment, dynamic modals
- [x] Branch 2 withdrawal batch (`branch-withdraw`, `record_branch_withdrawal_batch` RPC)
- [x] Notification unread badge counter (IDB + cross-tab sync)
- [x] Inventory accuracy gauge on `/inventory/accuracy`
- [x] Bean orders module (`/bean-orders`, `bean_*` tables, TrackingMore, slip upload)
- [x] AI full coverage: 24 AI-readable tables; deterministic bean orders + inventory accuracy routes
- [x] Sidebar menu drag-reorder (`sidebar-menu-order.ts`) + cross-device sync (`app_preferences`)
- [x] Proactive cross-module insights (`/api/insight-alerts`, Web Push, Command Center ops panels)
- [x] RLS hardening migration (`20260725120000`) + WAF config (`config/vercel-firewall.json`)
- [x] Shared `RoundedSelect` / select-trigger styles; view-transition navigation helpers
- [x] Schedule toolbar “ล้างทั้งหมด” removed
- [x] Inventory frequent-items localStorage cache
- [x] `shipBeanOrder` deferred TrackingMore + push via `after()` (no sync `trackingWarning`)
- [x] Retired: inventory recommended target stock; weather API; Market Insights module; obsolete root protocol/skill stubs; `daily-report-notification-actions.ts`

See `docs/changelog.md` and git history for dated entries.

---

## Backlog

### High Priority

- [ ] Real-time broadcast for shift updates (Supabase channel on `shifts`)
- [ ] Shift swap request module
- [ ] Inventory filter by name + category

### Medium Priority

- [ ] WCAG 2.2 accessibility audit
- [ ] Per-staff Supabase Auth (upgrade from PIN-only)

### Low Priority

- [ ] Inventory categories/groups
- [ ] Low-stock Web Push alerts (threshold-based)
- [ ] Reporting dashboard (stock trends, shift analytics)
- [ ] Multi-store support
