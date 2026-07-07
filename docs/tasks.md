# Tasks — BLACKANDBREW ERP

> Version: 9.1 | Last Updated: 2026-07-08

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
- [x] Retired: Market Insights module, inventory recommended target stock, graphify

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
