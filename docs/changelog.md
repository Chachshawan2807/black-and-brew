# Changelog — BLACKANDBREW ERP

> **Current Version:** 3.14 (Precision Table Image Capture) | **Last Updated:** 2026-05-17

---

## v3.14 — Precision Table Image Capture (2026-05-17)

### Phase 1: Action Planning & Analysis
- Developed layout re-nesting strategy in `docs/plans/2026-05-17-schedule-precision-capture.md`.
- Evaluated why the previous flexbox-1 structure produced extra bottom white spaces on vertical displays.

### Phase 2: DOM Restructuring & Tight Crop (R0 Standard Compliance)
- **Column Alignment Integration:** Nestled both the holiday label row and day-header segments inside the `min-w-[900px]` scrolling element. This resolves small-screen column shifting and aligns them across all screen dimensions.
- **Precision Element Targeting:** Moved `id="blackandbrew-schedule-table"` from the outer full-height flex container to the inner `min-w-[900px] h-fit` grid wrapper. This instructs `html-to-image` to tightly crop the exported file, eliminating the bottom white spaces.
- **Export Style Override:** Injected temporary style overrides (`margin: '0'`, `padding: '0'`, `border: 'none'`, `boxShadow: 'none'`) during rendering to cleanly parse calendar grids without outer margins or drop shadows.

### Phase 3: Integration and Build Clean Pass
- Verified all 8 unit tests passed cleanly via Vitest.
- Completed Next.js production build (`npm run build`) successfully with exit code 0.

---

## v3.13 — Swap Exporter to html-to-image (2026-05-17)

### Phase 1: Action Planning & Analysis
- Developed package management swap plan in `docs/plans/2026-05-17-schedule-image-export-swap.md`.
- Identified limitations of `html2canvas` regarding newer CSS standard parameters (e.g. `oklch()`).

### Phase 2: Dependency Mapping & Refactoring (R0 Standard Compliance)
- **Dependency Swapping:** Cleanly uninstalled `html2canvas` and installed the modern SVG-to-Canvas compiler `html-to-image`.
- **Dynamic Module Safety:** Used dynamic lazy imports inside the client event callback to cleanly prevent SSR crashes:
  ```typescript
  const { toPng } = await import('html-to-image');
  ```
- **Fidelity Specifications:** Mapped the exporter options to `pixelRatio: 2` (double-resolution details) and set the output to `quality: 1.0` in matching cream pastel (`#fdfcf0`) with scale correction `transform: 'scale(1)'`.

### Phase 3: Integration and Build Clean Pass
- Verified all 8 unit tests passed cleanly via Vitest.
- Completed Next.js production build (`npm run build`) successfully with exit code 0.

---

## v3.12 — High-Fidelity Schedule Image Export (2026-05-17)

### Phase 1: Action Planning & Analysis
- Developed the high-fidelity download target tasks in `docs/plans/2026-05-17-schedule-image-export.md`.
- Read and reviewed Visual Standards, Zero-Bold Policy, and dynamic modules rules.

### Phase 2: Refactoring & Dynamic Integration (R0 Standard Compliance)
- **Dependency Integration:** Successfully installed `html2canvas` for precise layout-to-pixel parsing.
- **Dynamic Imports Safety:** Used dynamic lazy imports for `html2canvas` inside the async export function to completely eliminate Next.js server-side compilation issues concerning client-only `window`/`document` models.
- **Export Resolution Control:** Calibrated the canvas scale to `scale: 2` (double-resolution mapping) so that exported PNG schedules remain extremely crisp when zoomed or printed. Styled canvas backdrops in matching cream pastel (`#fdfcf0`).
- **Precision Element Targeting:** Locked target container with `id="blackandbrew-schedule-table"`, cleanly capturing the core schedule grid (Header row, holiday slots, employee cells, daily sum FOH rows) while completely bypassing controls and sidebars.
- **UI Button Integration:** Rendered a modern capsule button next to header controls containing the `Download` icon:
  ```typescript
  "flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-normal text-slate-800 bg-slate-100 hover:bg-slate-200"
  ```
  strictly respecting the **Zero-Bold Policy** (`font-normal`).

### Phase 3: Integration and Build Clean Pass
- Verified all 8 unit tests passed cleanly via Vitest.
- Completed Next.js production build (`npm run build`) successfully with exit code 0.

---

## v3.11 — Purchase Orders Navigation Chips (2026-05-17)

### Phase 1: Action Planning & Analysis
- Developed the modern chip redesign layout tasks in `docs/plans/2026-05-17-po-tabs-refactor.md`.
- Read and reviewed Visual Standards, Zero-Bold Policy, and design instructions.

### Phase 2: Component Refactoring (R0 Standard Compliance)
- **Wrapper Modernization:** Redesigned the categories tab navigation layout in `page.tsx` using `flex flex-wrap gap-2.5 items-center pt-5 pb-4` to present a spacious, fluid navigation bar.
- **Pill-shaped Chips Design:** Completely decoupled the classic underlines (`border-b-2`) and replaced them with rounded navigation capsules (`rounded-full px-4 py-2 border font-normal whitespace-nowrap`).
- **Active state Styling:** Styled the chosen tab chip in soft black background (`bg-[#000000] border-[#000000] text-white shadow-sm`) strictly adhering to the Zero-Bold Policy (`font-normal`).
- **Inactive state Styling:** Styled unselected chips in transparent backgrounds with delicate margins (`border-neutral-200 text-neutral-800 hover:bg-neutral-50`).
- **Hierarchy Counts:** Mapped shift totals (e.g. `(101)`) in distinct `<span>` wrappers, downscaling counts to a lightweight `text-[12px] font-mono font-normal` inside active/inactive states for visual breathing room.

### Phase 3: Integration and Build Clean Pass
- Verified all 8 unit tests passed cleanly via Vitest.
- Completed Next.js production build (`npm run build`) successfully with exit code 0.

---

## v3.10 — Precise Deduplicated Summary Calculations (2026-05-17)

### Phase 1: Action Planning & Analysis
- Outlined the exact shift matching properties and deduplication tasks in `docs/plans/2026-05-17-schedule-summary-deduplication.md`.
- Inspected cell properties inside `ScheduleClient.tsx` to confirm location properties.

### Phase 2: Logic Refactoring (R0 Standard Compliance)
- **Cell Property Alignment:** Inspected grid items and confirmed cell parameters parse `s.metadata?.location` directly.
- **Active Profile Filtering:** Added a containment constraint `s.employee_id && orderedProfileIds.includes(s.employee_id)` to filter out historical shifts from deleted or inactive employees from the daily summary count.
- **Set-Based Deduplication:** Incorporated a deduplication logic mapping matching shifts to employee IDs inside a new `Set(...).size` to avoid counting multiple entries for a single employee on a single day.
- **Aesthetic and Visual Integrity:** Maintained original styling of the visual grid and the FOH totals row.
- **Zero-Bold Policy:** Checked all modified code segment properties to ensure zero bold styles are used.

### Phase 3: Integration and Build Clean Pass
- Verified all 8 unit tests passed cleanly via Vitest.
- Compiled the full Next.js production build (`npm run build`) successfully with exit code 0.

---

## v3.9 — Strict Shift Count Validation (2026-05-17)

### Phase 1: Action Planning & Analysis
- Outlined the strict work shifts summary task in `docs/plans/2026-05-17-schedule-summary-logic.md`.
- Identified `ScheduleClient.tsx` bottom-most summary calculations row for modification.

### Phase 2: Refactoring & Logic Integration (R0 Standard Compliance)
- **Strict Calculations Logic:** Formed the `VALID_WORK_SHIFTS` constant array: `['6:30', '7:00', '8:00']`.
- **Filtering Shift Constraints:** Rewrote the daily totals counter `fohCount` to count only when the shift's metadata location falls within `VALID_WORK_SHIFTS` and the shift is not marked as `on_leave`.
- **Aesthetic and Visual Integrity:** Ensured other specific shift designations (`ร้านซักผ้า`, `ไปสาขา 2`) are fully preserved in the rendering cells, modifying only the summation calculations row.
- **Zero-Bold Policy:** Maintained zero bold styling inside the summation grid block.

### Phase 3: Integration & Validation Checks
- Executed the full Vitest suite (`8/8 tests passed successfully`).
- Completed Next.js production bundler check successfully (`npm run build` completed with static route optimizations and exit code 0).

---

## v3.8 — Typography Refinement & Contrast Tuning (2026-05-17)

### Phase 1: Planning and Component Refactoring
- Created the design polish task schedule in `docs/plans/2026-05-17-typography-contrast.md`.
- Refactored `AIChatOverlay.tsx` to calibrate typographical weight hierarchy.

### Phase 2: Design Integrity (R0 Standard Compliance)
- **Typography Weight Calibration:** Scaled the chat bubble text weight down from `font-normal` (400) to `font-light` (300) and embedded the CSS `antialiased` utility, ensuring that the larger `text-[15px]` letters appear sleek, crisp, and beautifully proportioned on all screens.
- **Deep Coffee Contrast tuning:** Boosted secondary captions ("AI ผู้ช่วยร้าน BLACKANDBREW" and the "กำลังคิด..." status label) from a generic transparent black (`text-[#000000]/40`) to a high-contrast `#1a1a1a` Dark Coffee shade, which provides superior visibility under varying coffee shop lighting conditions.
- **Logo Symbol Re-check:** Verified that all SVG imports cleanly render `/ai-agent-logo.svg` without rendering artifacts.
- **Zero-Bold Audit:** Verified that Zero-Bold policy constraints are fully satisfied across all modified components.

### Phase 3: Integration and Build Clean Pass
- Verified all 8 unit tests passed cleanly via Vitest.
- Compiled the full Next.js production build (`npm run build`) successfully with exit code 0.

---

## v3.7 — AI Agent UI Polish & Interaction (2026-05-17)

### Phase 1: Action Planning & TDD Verification
- Drafted the UI polish task schedule in `docs/plans/2026-05-17-ai-agent-ui-polish.md`.
- Cleared the unused `MessageCircle` import from `lucide-react` at the top of `AIChatOverlay.tsx`.

### Phase 2: High-Density UI Upgrades (R0 Standard Compliance)
- **Floating Button Swap:** Replaced generic `MessageCircle` closed-state trigger icon with a pure white branding logo (`/ai-agent-logo.svg` + inverted filter) rendering inside the floating circular button.
- **Bubble Text Scaling:** Scaled the chat bubble font size up from `text-[13px]` to `text-[15px]` to maximize reading comfort on mobile screens and tablets, strictly maintaining standard typography `font-normal` (Zero-Bold Policy).
- **Click Outside to Close:** Added an invisible backdrop transition wrapper (`fixed inset-0 z-[198] bg-black/0`) within the `<AnimatePresence>` block so that clicking on empty space immediately closes the active overlay panel.

### Phase 3: Validation and Build Clean Pass
- Resolved a React fragment hierarchy syntax edge case before final checks.
- Executed the full Vitest command line suite (`8/8 tests passed successfully`).
- Ran and completed the Next.js production build (`npm run build` completed with static route optimizations and exit code 0).

---

## v3.6 — AI Agent Custom Branding Logo (2026-05-17)

### Phase 1: Planning and Component Refactoring
- Created the logo update plan `docs/plans/2026-05-17-ai-agent-logo.md`.
- Refactored `AIChatOverlay.tsx` by removing the generic Lucide `<Bot />` icon and importing Next.js `<Image />` component.
- Implemented `/ai-agent-logo.svg` across all 3 key branding elements: the chat header, the typing indicator, and the assistant message avatar.
- Preserved perfect layout symmetry with rounded borders and correct size classes (`w-6 h-6` for header, `w-5 h-5` for bubble/loader avatars).

### Phase 2: Design and Build Integrity Check
- Verified compliance with the **Zero-Bold Policy** across all modified files.
- Executed and passed all 8 unit tests in the Vitest suite.
- Built the Next.js production app successfully using `npm run build` with zero issues or warning logs.

---

## v3.5 — Persistent Date Range via Cookies (2026-05-17)

### Phase 1: Failing Test Design (TDD Red Phase)
- Created `src/test/dashboard_date_cookies.test.ts` to assert that:
  1. Client-side cookie setting functions correctly update `document.cookie` with selected date parameters.
  2. The server-side resolution follows the hierarchical priority: URL search params > saved cookies > Monday-Sunday fallback default.

### Phase 2: Component Refactoring (TDD Green Phase)
- **Client Component (`LiveShiftList.tsx`):** Added logic in `handleDateChange` to set `dashboard_start_date` and `dashboard_end_date` cookies with 1-year max-age and `SameSite=Lax` constraint prior to URL search parameter navigation.
- **Server Component (`dashboard/page.tsx`):** Integrated Next.js `cookies()` parser into the server-rendered dashboard page. Replaced URL parameter fallback with a chain checking URL search parameters first, then cookies, and finally the current week.

### Phase 3: Integrity Validation & Daily Closing
- **Tests:** Executed and passed all 8 tests in the suite successfully (Vitest exit code 0).
- **TypeScript & Build:** Ran Next.js production build (`npm run build`) successfully with zero type checking or optimization warnings.
- **Zero-Bold Policy:** Confirmed zero bold font weight violations in all newly added or modified code segments.

---

## v3.4 — Project-Wide Omni-Refactor & AI Sync (2026-05-17)

### Phase 1: Architectural Scan
- Scanned `src/`, `public/`, `sql/`, and root config files.
- Identified 4 issues: 3 orphaned files in `src/lib/agent-tools/`, 1 empty type stub, 1 Zero-Bold violation, and missing `isMounted` guard in AI overlay.

### Phase 2: Dead Code & Junk Purge
- **Deleted:** `src/lib/agent-tools/fs_tool.ts` — not imported anywhere in codebase.
- **Deleted:** `src/lib/agent-tools/search_proxy.ts` — not imported anywhere in codebase.
- **Deleted:** `src/lib/agent-tools/shell_tool.ts` — not imported anywhere in codebase.
- **Deleted:** `src/types/supabase.ts` — empty 0-byte file (placeholder stub, no content).

### Phase 3: AI Optimization Check
- **Verified:** `route.ts` uses `providerOptions.google.generationConfig.maxOutputTokens` ✅
- **Verified:** All tools use `inputSchema` (Vercel AI SDK v6 standard) ✅
- **Verified:** Sliding window memory (`messages.slice(-4)`) in place to prevent token bloat ✅
- **Verified:** Surgical tool partitioning with column-selected queries and `.limit(8)` ✅
- **Security:** AI route reads via Supabase Security Definer RPCs (`get_ai_store_status`, `get_ai_inventory_item_details`) — anon key cannot bypass RLS on write operations ✅

### Phase 4: Visual & Hydration Enforcement
- **Zero-Bold Fix:** Changed `font-medium` → `font-normal` on "บรู" name label in `AIChatOverlay.tsx` (line 90).
- **Hydration Guard:** Added `isMounted` state with `useEffect` to `AIChatOverlay.tsx` to prevent browser-only globals from running during SSR.
- **Build:** `npm run build` → **Exit Code 0** ✅

---



### AI Assistant "บรู" Frontend

- **Chat Overlay UI:** Created `src/components/ai/AIChatOverlay.tsx` with a pastel theme, compact dimensions (max-h-[70vh], overflow-y-auto), bottom-right positioning, Framer Motion open/close animations (0.2s), and `isMounted` protection for prerendering. The component was directly integrated into `src/app/[locale]/layout.tsx` and the redundant `AIChatWrapper.tsx` was removed.
- **Typography Enforcement:** Implemented a strict "no bold text" policy for all chat messages and inputs, using `font-normal` or `font-medium` to maintain consistent aesthetic standards.
- **Impact:** Provided a visually appealing and functional chat interface for the AI Assistant, ensuring a smooth user experience and adherence to design guidelines.
- **Evidence:** `src/components/ai/AIChatOverlay.tsx`, `src/app/[locale]/layout.tsx`

### AI Assistant "บรู" Backend

- **Read-Only Views and RPCs:** Created `view_today_shifts` and `view_inventory_summary` for safe, summarized data access. Implemented `get_ai_store_status` and `get_ai_inventory_item_details` RPCs in Supabase to provide comprehensive, controlled data to the AI assistant.
- **API Route Handler:** Developed `src/app/api/chat/route.ts` using Vercel AI SDK v6. Ensured compliance with AI SDK v6 standards by utilizing `providerOptions.google.generationConfig.maxOutputTokens` and `inputSchema` for tools, including the new inventory item details RPC.
- **Impact:** Enabled secure and efficient data access for the AI Assistant, adhering to modern AI SDK standards and promoting maintainability.
- **Evidence:** `sql/ai_agent_views.sql`, `src/app/api/chat/route.ts`

## v3.2 — Typography & UI Optimization (2026-05-16)

### High-Legibility Scaling (R0 Standard)

- **Typography Scale-up (+2 Sizes):** อัปเกรดขนาดตัวอักษรของหัวข้อย่อย (Sub-labels) และป้ายกำกับฟิลด์ (Input Labels) จาก `text-[11px]` เป็น **`text-[13px]/text-[14px]`** ทั่วทั้งระบบ
- **Space Integrity Guard:** ปรับลด Padding และ Margin แบบสัดส่วนผกผันเพื่อให้หน้าต่าง Modals ยังคงความกะทัดรัด (One-Shot View)
- **Zero-Bold Policy Enforcement:** บังคับใช้ `font-normal` และ `font-medium` ทั่วทั้งแอปพลิเคชัน ห้ามใช้ตัวหนาเด็ดขาด
- **Documentation Standard:** อัปเดต `docs/rules.md` และ `docs/design.md` เพื่อใช้เป็นกฎเหล็กสำหรับ AI Agent ในอนาคต

### System-Wide Big Cleaning & Audit (R0 Standard)

- **Syntax & Code Smells:** Removed unused `Tool` import in `maintenance/page.tsx` resolving a critical TypeScript build error. Purged all debug `console.log` statements across `inventory-actions.ts`, `shift-actions.ts`, `ScheduleClient.tsx`, and `search_proxy.ts` for clean production terminal output.
- **Security & Error Boundary:** Fixed a potential crash in `shift-actions.ts` by adding optional chaining (`firstError.error?.message`) to prevent null-reference TypeErrors during DB synchronization.
- **React & Build Optimization:** Verified complete dependency array integrity across all hooks. Achieved 100% successful `npm run build` with zero linting or TS errors.
- **UI Integrity Verified:** System-wide scan confirmed 0 instances of `font-bold` or `font-semibold`. The "Zero-Bold Policy" and "DOM Separation" for DnD remain uncompromised.

## v3.2 — Performance & DnD Stabilization (May 2026)

### Interaction Mirroring (R0 Standard)

- Implemented **Perfect Mirroring** of DnD interactions from Inventory to Dashboard and Schedule.
- Enforced precision sensors (**distance: 5px**) and **closestCorners** collision detection system-wide.
- Integrated **Framer Motion Layout** for smooth card/row "Gliding" animations.
- Unified spring physics (**stiffness: 300, damping: 30**) across all sortable components.

### Data & Persistence

- Fixed "Drag-and-Drop bounce-back" in Schedule by syncing column targets to `schedule_order`.
- Transitioned all list reordering to **Service Role Server Actions** to bypass RLS latency.
- Enforced high-legibility standards with **pure black (#000000)** text on pastel backgrounds.

### Documentation & Governance

- Established **MASTER_BLUEPRINT.md** as the definitive architectural single source of truth.
- Completed **Daily Closing Integrity Workflow [R0]** with 100% build pass.

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
