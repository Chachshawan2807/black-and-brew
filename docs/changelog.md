# Changelog — BLACKANDBREW ERP

> **Current Version:** 3.1 (System Rebirth) | **Last Updated:** 2026-05-15

---

## v3.2 — Performance & DnD Stabilization (May 2026)

### Interaction Mirroring (R0 Standard)

-   Implemented **Perfect Mirroring** of DnD interactions from Inventory to Dashboard and Schedule.
-   Enforced precision sensors (**distance: 5px**) and **closestCorners** collision detection system-wide.
-   Integrated **Framer Motion Layout** for smooth card/row "Gliding" animations.
-   Unified spring physics (**stiffness: 300, damping: 30**) across all sortable components.

### Data & Persistence

-   Fixed "Drag-and-Drop bounce-back" in Schedule by syncing column targets to `schedule_order`.
-   Transitioned all list reordering to **Service Role Server Actions** to bypass RLS latency.
-   Enforced high-legibility standards with **pure black (#000000)** text on pastel backgrounds.

### Documentation & Governance

-   Established **MASTER_BLUEPRINT.md** as the definitive architectural single source of truth.
-   Completed **Daily Closing Integrity Workflow [R0]** with 100% build pass.

---

## v3.1 — System Rebirth & Staff Access Refinement (May 2026)

### Transaction System Rebirth

- Implemented **Two-Step Fetch** strategy for transaction history — bypasses FK join and RLS silent failures
- Applied `unstable_noStore()` cache buster for all transaction queries
- Renamed column `product_id` → `inventory_item_id` via migration script
- Added comprehensive server-side telemetry (`console.log`) for deep debugging
- Fixed UI mappings in history modal for accurate data display

### Staff Dashboard

- Removed restricted "Inventory Management" shortcuts from Staff Dashboard
- Established root redirect `/` → `/th` via `src/app/page.tsx`

### Standards

- Enforced `inventory_item_id` naming across all Server Actions and queries
- Verified Two-Step Fetch eliminates silent failures in transaction reporting
- Footer badge: `System Rebirth v3.1`

---

## v3.0 — The Great Purge: Zero-Waste Architecture (May 2026)

### Dead Code Elimination

- Removed 14+ orphaned files: `mem0.py`, `gemini.ts`, `token-utils.ts`, `memory.ts`, debug scripts
- Purged `__pycache__/`, `grep_ast/`, broken `[locale` bracket directory, empty `staff/` route
- Removed dead `src/app/api/` tree

### Dependency Cleanup

- Uninstalled 3 unused npm packages: `js-tiktoken`, `tokentracker-cli`, `@google/genai`
- Reduced `node_modules` by 39 packages

### Technical Fixes

- Fixed TypeScript type narrowing in inventory `onBlur` handler
- Fixed duplicate interface property in `ScheduleClient.tsx`
- Migrated inventory grid from flex-based layout to standard HTML `<table>`/`<tr>`/`<td>`
- Fixed React hydration error by moving `<DndContext>` outside `<tbody>`
- Verified clean `next build` — zero errors across all 5 route modules

---

## v2.6 — High-End Inventory Grid (May 2026)

### Undo/Redo Stability

- Refactored history engine with snapshot-based persistence
- Resolved "two-click" desync bug
- Implemented state-locking during database sync (`isSyncing`)

### Numeric Formatting

- Integrated "Smart Sanitizer" for leading zeros (05 bug)
- Fixed empty-string Supabase errors for numeric columns

### UI Enhancements

- Applied "Super-Soft Pastel" theme with `rounded-3xl`
- Full-form "Add Item" modal with 2-column grid
- Custom confirmation dialogs (replaced browser `alert()`)

---

## v2.2 — Global Omni-Refactor (May 2026)

### UI Architecture

- Flattened all overlapping DOM structures
- Native inputs hidden using `sr-only` for accessibility + styling control

### Data Integrity

- Implemented "Safe Deletion" globally (shifts before profiles — FK safety)
- Optimistic UI triggers instantly using `.filter()`

### Aesthetics (R0 Constraints)

- Eradicated all `font-bold` and `font-semibold` (app-wide `font-normal`)
- Unified text colors: primary `#000000`, secondary `#4b5563`

### System Cleanup

- Purged deprecated testing scripts
- Cleaned `.gitignore`
- Streamlined Next.js server actions

---

## v2.0 — Foundation (May 2026)

### Core Setup

- Initialized Next.js 16 with App Router
- Configured Supabase with Thailand Edge Region
- Setup Tailwind CSS 4 with PostCSS
- Implemented i18n via `next-intl` (th/en)

### Modules Built

- Dashboard (Command Center) with LiveShiftList
- Schedule with Drag-and-Drop shift management
- Inventory with spreadsheet-style inline editing
- Maintenance equipment tracking

### Database

- Applied core schema: `profiles`, `shifts`, `inventory_items`
- Setup RLS policies for collaborative access
- Created `record_inventory_transaction` RPC function
- Implemented Real-time Channels for cross-device sync

---

## Migration History

| Version | Key Change | SQL File |
| :--- | :--- | :--- |
| v2.0 | Core tables (profiles, shifts, inventory_items) | `DB_SCHEMA.sql` |
| v2.0 | Transaction table + RPC | `setup_inventory_transactions.sql` |
| v2.6 | Add sort_order column | `add_inventory_sort_order.sql` |
| v2.6 | Dynamic column config table | `inventory_config_schema.sql` |
| v3.0 | Open RLS for collaborative access | `update_rls_policies.sql` |
| v3.1 | Rename product_id → inventory_item_id | `fix_transaction_relationships.sql` |
| v3.1 | Transaction RLS policies | `apply_rls_transactions.sql` |
