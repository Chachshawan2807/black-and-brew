# Tasks — BLACKANDBREW ERP

> Version: 8.6 | Last Updated: 2026-06-15

---

## Completed Tasks ✅

### Phase 1: Environment Setup

- [x] Initialize Next.js 16 with App Router & next-intl (i18n)
- [x] Configure Supabase Project with Thailand Edge Region
- [x] Setup Tailwind CSS 4 with PostCSS
- [x] Setup Zustand for global state management
- [x] Configure Vitest for testing

### Phase 2: Core Engine & Database

- [x] Apply `DB_SCHEMA.sql` — profiles, shifts, inventory_items tables
- [x] Apply `inventory_config_schema.sql` — dynamic column config
- [x] Apply `setup_inventory_transactions.sql` — transactions + RPC
- [x] Apply `fix_transaction_relationships.sql` — rename `product_id` → `inventory_item_id`
- [x] Apply `apply_rls_transactions.sql` — RLS for transactions table
- [x] Apply `update_rls_policies.sql` — open RLS for profiles & shifts
- [x] Implement Timezone Helper Functions (UTC to GMT+7)
- [x] Setup Supabase Singleton Client with Real-time config
- [x] Setup Service Role Client for Server Actions

### Phase 3: UI Modules

- [x] Build Dashboard (Command Center) with LiveShiftList & ShiftCard
- [x] Build Schedule module with Drag-and-Drop shift management
- [x] Build Inventory module — spreadsheet-style inline editing
- [x] Build Maintenance module — equipment tracking
- [x] Build Sidebar navigation with collapsible menu
- [x] Implement Google Sheets-style Enter-to-Next-Row navigation
- [x] Implement Drag-and-Drop row reordering (@dnd-kit)
- [x] Implement Undo/Redo with full state persistence
- [x] Implement Quick Entry (Stock In/Out) with search
- [x] Implement Transaction History modal (Two-Step Fetch)
- [x] Implement Purchase Orders modal with source-based tabs
- [x] Implement Dynamic Column Labels (from inventory_config)
- [x] Implement Column Resize with localStorage + DB persistence
- [x] Implement Computed Auto-Ordering (order_qty = target_stock - stock)
- [x] Implement Thai Holiday sync via Google Calendar API

### Phase 4: Refactoring & Optimization

- [x] Global Omni-Refactor — purge all `font-bold` → `font-normal`
- [x] Flatten DOM architecture (remove absolute/z-index overlaps)
- [x] Safe Deletion protocol (child records before parent)
- [x] Dead Code Purge — remove 14+ orphaned files
- [x] Dependency Cleanup — uninstall 3 unused npm packages
- [x] TypeScript strict typing — `any` → `unknown` in agent tools
- [x] Migrate inventory grid from flex to HTML table
- [x] Fix React hydration error (DndContext outside tbody)
- [x] Staff Dashboard cleanup — remove restricted inventory shortcuts
- [x] Root redirect `/` → `/th` via page.tsx
- [x] Transaction System Rebirth v3.1 (Two-Step Fetch + Cache Buster)
- [x] Agent Skills System installation (FS Tool, Shell Tool, Search Proxy)

### Phase 5: PWA, Real-Time Status, & Touch-Accessible DnD (June 2026)

- [x] Integrate LINE Messaging API push alerts for daily baristas shifts and weather reports
- [x] Configure standard PWA support (web manifest, service worker registration, iOS status bar, Network-First caching strategy)
- [x] Add real-time db state tracking using custom `LiveStatusTracker`
- [x] Add dynamic layout for collapsible sidebar nav (`Menu.tsx`, `Sidebar.tsx`, etc.)
- [x] Implement inline-editable `/inventory/count` route with auto-save on blur/Enter
- [x] Fix mobile layout bugs (Quick Entry card overflow, shopping cart badge truncation)
- [x] Configure custom touch and mouse sensor thresholds (`TouchSensor` with 250ms delay) to enable drag-and-drop on mobile touch devices
- [x] Add mobile touch-event layout test suite (`src/test/mobile_layout.test.tsx`)

### Phase 6: Inventory Stock Sync & Motion System (June 2026)

- [x] Unify stock writes via `updateInventoryStock()` + RPC `set_inventory_stock`
- [x] Fix realtime merge (`mergeInventoryRealtimeUpdate`) across warehouse + count pages
- [x] Remove `inventory-items.csv`; DB-only sort_order migration
- [x] PO PNG export filtered by selected purchase channel
- [x] Add `sql/sync_inventory_stock.sql` (RPC, trigger, REPLICA IDENTITY FULL)
- [x] Add `src/lib/inventory-stock.ts` + `src/test/inventory_stock_sync.test.ts`
- [x] Implement global motion system (`globals.css`, `motion-presets.ts`, `PageTransition`)
- [x] Add `FloatingAlert` / `FloatingToast` with auto fade-out
- [x] Apply premium micro-interactions (200ms) to Button, Input, Sidebar

### Phase 7: Auth, Sales & Security (June 2026)

- [x] PIN Gateway with server-side `verifyPin()` + httpOnly cookies
- [x] Read-only mode (PIN `111222`) with `assertWritableSession()` guards
- [x] Auth tests: `auth.test.ts`, `session_auth.test.tsx`, `read-only-guard.test.ts`
- [x] Sales module — Excel upload, categories, metrics (`sales_schema.sql`)
- [x] Market Insights — Gemini analysis with localStorage cache
- [x] Full security hardening (v6.7) — auth checks on all write server actions
- [x] XSS sanitization in `AIChatOverlay.tsx`
- [x] Inventory RLS hardening (`sql/fix_inventory_rls.sql`)
- [x] AI chat refactor — deterministic daily-schedule path + `getDailyShifts`/`readTable`/`internetSearchTool` (v8.0–8.1)
- [x] Documentation full sync (2026-06-08)
- [x] Documentation sync v8.2 — version/date headers, env var corrections, changelog entry (2026-06-09)
- [x] Market Insights v2 — isolated module with multi-step generateObject pipeline, Zod-validated output, weather/holidays/Tavily context builders, optional Google Places competitors, market_insight_runs Supabase table, ContextPanel/AlertsCard/InsightCharts/ActionChecklist/SourcesList/DiffBanner components (2026-06-09)
- [x] Documentation sync v8.3 — Market Insights v2 reflected in architecture/database/api/context/tasks/changelog/memory (2026-06-09)
- [x] Dark theme — `next-themes` + CSS tokens + `bb-pastel-surface` pattern; Settings page theme picker; migrate inventory/sales/maintenance/schedule/market-insights/AI chat/export overlay (2026-06-12)
- [x] Documentation sync v8.4 — dark theme + settings route reflected in all project `.md` files (2026-06-12)
- [x] Security audit tables — `login_history`, `data_change_logs`, `revoked_sessions` migrations + Settings session management (2026-06-12)
- [x] Inventory in-app notifications — Realtime on `data_change_logs`, notification prefs in Settings, `InventoryQuickActionFAB` (2026-06-12)
- [x] Documentation sync v8.5 — security + notifications reflected in docs; graphify refresh (2026-06-12)
- [x] Inventory count accuracy — `inventory_count_verifications` (`system_stock_qty`), accuracy stats (2026-06-16 refactor)
- [x] Inventory quick action bulk — `recordBulkInventoryTransactions()`, `inventory-quick-*` libs, `InventoryRealtimeContext` (2026-06-15)
- [x] Global tooltips — `AppTooltipProvider` + `HintTooltip` (2026-06-15)
- [x] PWA manifest icons — `/images/notification-icon*.png`, theme `#ffffff`/`#000000` (2026-06-15)
- [x] SQL/doc cleanup — extract `sql/record_inventory_transaction.sql`, delete 11 legacy SQL files (2026-06-15)
- [x] Documentation sync v8.6 — count accuracy, quick action, tooltips, PWA, SQL cleanup (2026-06-15)

---

### Dark Theme Remediation (June 2026)

Plan: `docs/plans/2026-06-12-dark-theme-remediation.md`

- [x] Phase 0 — Grep audit baseline + pass criteria + file inventory (2026-06-12)
- [x] Phase 1 — Shared UI primitives (`ClickableInput`, `ClickableDatePicker`, inventory modals, dropdown) (2026-06-12)
- [x] Phase 2 — Command Center + Dashboard (`LiveStatusTracker`, `LiveShiftList`, `MonthlyRoster`) (2026-06-12)
- [x] Phase 3 — Schedule (`ScheduleClient.tsx`) (2026-06-12)
- [x] Phase 4 — Maintenance (`page.tsx`, `MaintenanceModals.tsx`) (2026-06-12)
- [x] Phase 5 — Inventory (`page.tsx`, PO modal, quick actions) (2026-06-12)
- [x] Phase 6 — Sales + Market Insights + `chart-theme.ts` (2026-06-12)
- [x] Phase 7 — Integration build + re-audit (2026-06-12); visual QA manual pass remaining

---

## Backlog 📋

### High Priority

- [ ] Build Real-time Broadcast for Shift updates (Supabase Channel on shifts table)
- [ ] Develop Drag-to-Shift Calendar Interface (visual shift scheduling)
- [ ] Create Swap Request module (shift swap between staff)
- [ ] Add `inventory_items` sort by name + category (filterable inventory)

### Medium Priority

- [ ] Integrate WCAG 2.2 Accessibility audit
- [ ] Implement JSON-LD structured data for AI interoperability
- [ ] Deploy Edge Functions for faster data fetching
- [ ] Add Supabase generated Database types (replace `any`)
- [ ] Upgrade from PIN-only to per-staff Supabase Auth (individual accounts)

### Low Priority

- [ ] Add inventory categories/groups
- [x] Inventory in-app notifications via `data_change_logs` Realtime + PWA push prefs (v8.5)
- [ ] Implement low-stock LINE/push alerts (threshold-based)
- [x] ~~Add export to CSV/PDF for Purchase Orders~~ — PNG export by channel (v6.8)
- [ ] Build reporting dashboard (stock trends, shift analytics)
- [ ] Implement multi-store support
