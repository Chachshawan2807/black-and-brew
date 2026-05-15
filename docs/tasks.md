# Tasks — BLACKANDBREW ERP

> **Version:** 3.1 | **Last Updated:** 2026-05-15

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
- [ ] Create staff authentication flow (Supabase Auth)

### Low Priority

- [ ] Add inventory categories/groups
- [ ] Implement inventory alerts/notifications (low stock)
- [ ] Add export to CSV/PDF for Purchase Orders
- [ ] Build reporting dashboard (stock trends, shift analytics)
- [ ] Implement multi-store support
