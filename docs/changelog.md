# Changelog — BLACKANDBREW ERP

> **Current Version:** 3.24 (Safe Hydration Direct Sync & NextConfig Compatibility) | **Last Updated:** 2026-05-21

---

## v3.24 — Safe Hydration Direct Sync & NextConfig Compatibility (2026-05-21)

### Safe Hydration Direct Sync
- **Direct Props Hydration (`ScheduleClient.tsx`)**: Replaced the fragile `useEffect` state-blocking conditional logic with a direct, straightforward synchronization block. It maps `initialProfiles`, `initialShifts`, `initialHolidays`, and `initialDateStr` unconditionally into local React states (`profiles`, `shifts`, `holidays`, `currentDate`, `orderedProfileIds`) on any prop update, solving the dynamic data revalidation/refresh loss of shifts.

### Next.js 16 Config & Build Alignment
- **Dynamic Config Compatibility (`page.tsx`)**: Removed `export const dynamic = 'force-dynamic'` from `/schedule/page.tsx` to prevent build-time conflicts with the Turbopack `nextConfig.cacheComponents` configuration. Freshness is maintained via `cache: 'no-store'` inside fetch configurations and utilizing server action path revalidation, ensuring a successful Next.js production build.

---

## v3.23 — Scheduler Atomic Operations & Sync (2026-05-19)

### Atomic Uniqueness Defense (Backend)
- **Delete-then-Insert Strategy (`saveShift`)**: Redesigned `saveShift` Server Action in `shift-actions.ts` to operate as a single transaction Service Role block. It now strictly deletes any pre-existing shifts for that specific employee on that date (`supabaseAdmin.from('shifts').delete()`) before inserting the new record, permanently eliminating duplicate scheduling conflicts without DB constraints modification.
- **Cache Invalidation**: Linked paths invalidation securely across both `/schedule` and `/dashboard` pages upon successful transaction execution.

### Latency Debounce & Fetch-after-Save (Frontend)
- **Post-Save Fetch-after-Save Strategy**: Swapped all optimistic UI assumptions and custom rollbacks inside `handleSave` under `ScheduleClient.tsx` in favor of a direct post-save database synchronization flow.
- **Latency Debounce**: Introduced a 500ms delay before execution (`setTimeout` block) to allow Supabase database replication to completely settle.
- **Widen Timezone Padding**: Widen the fetch range by +- 1 day (`startRange` and `endRange` derived from `weekDays`) to completely eliminate edge-of-timezone overflow issues, preventing shifts from silently disappearing from the grid UI.
- **History Stack Cleanse**: Purged all manual `undo()` and `pushToHistory()` triggers from `handleSave` to strictly rely on the database as the unique source-of-truth.

---

## v3.22 — Storage Verification & Architectural Parity (2026-05-18)

### Type-Guarded LocalStorage Parsing
- **Safe Deserialization (Type Validation Engine)**: Enforced type guards on all JSON deserialization from `localStorage` across `CommandCenterGrid`, `MaintenancePage`, and `InventoryPage` to prevent UI corruption, injection, or crash from corrupted/modified storage states.
- **Validation Rules**: Checked keys, value types, array dimensions, and bounds (e.g. `typeof key === 'string' && typeof val === 'number' && val > 0 && val < 2000`) before state application.

### Production Build & Document Sync
- **Production Ready**: Executed clean production package compilation with `npm run build` (exit code 0).
- **Blueprint & Skills Alignment**: Synchronized `MASTER_BLUEPRINT.md`, `SKILLS_INVENTORY.md`, and created `docs/skills.md` to increment versions (v3.22, 4.1) and document secure session-only auth isolation, brute-force prevention, and storage safety standards.

---

## v3.21 — Session Integrity & Storage Audit (2026-05-18)

### Phase 1: Storage Cleanse & Purge
- **Purged localStorage for Auth**: Completely scanned and purged all legacy `localStorage` calls managing auth status or credentials (`bb_auth_pin`), preventing stale browser memory or cross-session persistence.
- **Session-Only PIN Verification**: Refactored `PinGateway.tsx` client component to strictly check and store client auth state using `sessionStorage.getItem('bb_auth_pin_verified')` only.
- **Strict Tab Isolation**: Enforces PIN gate check for every new tab opened or browser restart 100%, since `sessionStorage` is unique to the browser window/tab session.

### Phase 2: Logout Sync & Navigation Cleanse
- **Client Session Revocation**: Updated the Logout button in the sidebar `Menu.tsx` to immediately invoke `sessionStorage.removeItem('bb_auth_pin_verified')` alongside server-side cookie clearing, ensuring instantaneous state termination.
- **Lockout State Preservation**: Safely preserved failed login attempt lockout tracking via `localStorage` (`bb_failed_attempts` and `bb_lockout_until`) so brute-force prevention cannot be bypassed by simply opening new tabs or refreshing.

### Phase 3: TDD Validation & Build Pass
- **TDD Test Suite**: Designed and wrote a robust frontend test suite `src/test/session_auth.test.tsx` verifying session-only isolation, non-auth leakage to `localStorage`, and correct default gate blockage. All 11 tests pass successfully.
- **Production Build Integrity**: Successfully built the production package using `npm run build` with zero compile warnings and exit code 0. Zero-Bold (`font-normal` + `antialiased`) and morning latte cream (#fdfcf0) are completely intact.

---

## v3.20 — Server-Side Security Hardening & Sidebar Layout Optimization (2026-05-18)

### Phase 1: Security Gate Hardening & Anti-Brute Force

- **Server-Side Verification**: Moved PIN verification completely to the server-side (`src/app/actions/auth.ts` Server Actions) to prevent client bundles from exposing verification keys.
- **Environment Isolation**: Renamed `NEXT_PUBLIC_APP_PIN` to `APP_PIN` in `.env.local` to completely prevent env leakage to client-side bundles.
- **HTTP-Only Secure Cookie Session**: Employs a secure HTTP-Only, `SameSite=Strict` cookie (`bb_auth_pin_verified`) on successful login.
- **Anti-Brute Force (Rate Limiter)**: Implemented a robust lockout mechanism triggering a 15-minute countdown screen after 5 failed entries, persisting across window/tab refreshes via `localStorage` state tracking.
- **Zero-Bold Policy Lockout Screen**: Lockout screens adhere 100% to Morning Latte Cream (#fdfcf0) styling with pure `font-normal` and `antialiased` typography.

### Phase 2: Sidebar Height & Layout Optimization

- **Flexbox Restructuring**: Transformed Sidebar into a rigid Flexbox column `flex flex-col h-full overflow-hidden justify-between` to ensure it fits 100% Viewport Height perfectly.
- **Scrollbar Elimination**: Completely removed the bloated Radix-UI `ScrollArea` component, replacing it with a direct vertical list and dynamic internal `overflow-y-auto` scroll behavior on menu items only.
- **Static Bottom Logout**: Anchored the Logout button statically to the bottom (`mt-auto`) using CSS Flex separation, guaranteeing it remains visible and styled cleanly without viewport leakage.
- **Server-Side Session Terminate**: Linked the menu's Logout action to the `clearAuth()` server action to dynamically clear the HTTP-Only cookie, preventing stale credential usage.

### Phase 3: Production Readiness & Integrity

- **Build Pass**: Checked typescript validation, assets loading, and Next.js compiles with Exit Code 0.
- **Git Sync & Protection**: Confirmed `.env.local` is protected in `.gitignore`. Committed daily development files.

---

## v3.19 — Daily Closing Integrity Workflow (2026-05-18)

### Phase 1: Security & Quality Checks

- **Markdown Linting**: ล้าง Trailing spaces และจัดระเบียบโครงสร้างเอกสารผ่าน Script `format_markdown.js` สำเร็จ 100%
- **Zero-Bold Policy**: ยืนยันไม่มีการใช้งาน `font-bold` หลุดรอดเข้ามาในระบบ UI และหน้าแชท AI
- **XSS Prevention**: ระบบอ่าน `localStorage` (Mobile UX) ถูกล็อกด้วย Type Validator (JSON Parse Guard) แล้ว
- **Hydration Guards**: คอมโพเนนต์ AI และ Modal ทั้งหมดทำงานผ่าน `isMounted` อย่างเคร่งครัด
- **Persistent Zero**: ตรรกะจัดการคลังสินค้ายังคงรักษาเลขศูนย์อย่างแม่นยำ

### Phase 2: Production Readiness

- **Build Pass**: ทดสอบระบบ `npm run build` ปรากฏว่าผ่านฉลุย Exit Code 0 อย่างสมบูรณ์
- **Cloud Sync**: รันระบบจัดเก็บ `.gitignore` รักษาความลับไฟล์ API Key กรองขยะ และ Commit ยอดงานประจำวันขึ้นสู่ GitHub

---

## v3.18 — Project-Wide Omni-Refactor & AI Sync (2026-05-18)

### Phase 1: Architectural Scan & Dead Code Purge (v3.18)

- **Zero-Bold Validation**: ตรวจพบความสมบูรณ์ 100% ไม่มี `font-bold` เล็ดลอดเข้ามาทำลายกฎ Morning Latte Cream
- **TypeScript & ESLint Audit**: สแกนโค้ดและรัน Linter ทั่วโปรเจกต์ ล้างตัวแปรที่ไม่ได้ใช้ (Dead Code/Unused Variables)
- **Dead Import Removal**: ตัด `AnimatePresence` ที่ไม่ได้ใช้งานออกจาก `ScheduleClient.tsx` เพื่อลด Bundle Size และเพิ่มความเร็ว Render

### Phase 2: AI Token Optimization & Context Sync (v3.18)

- **Token Compressor Creation**: สร้างสคริปต์แกนหลัก `src/utils/thaiTokenOptimizer.ts` สำหรับบีบอัดข้อความภาษาไทย (ลบช่องว่าง, ลดอักขระซ้ำซ้อนเช่น '555', 'ๆๆๆ')
- **Deep SDK Integration**: นำ `thaiTokenOptimizer` เข้าเสียบใน `route.ts` ครอบคลุมทั้ง `clientContext` (Context Injection) และ `recentMessages` ทำให้ AI รับรู้สถานะจอภาพโดยประหยัด Token สูงสุด
- **AI Hydration Check**: ระบบส่งต่อข้อมูลทำผ่าน Server-side ปลอดภัยไร้ปัญหา Layout Shift หรือ Hydration Mismatch

### Phase 3: Zero-Error Validation (v3.18)

- ระบบทำการ Re-build หลังจากการผ่าตัดโค้ด
- **Compilation Results**: TypeScript ผ่านสมบูรณ์, สร้าง Static Pages ครบทุกหน้า `Exit Code 0`

---

## v3.17 — Security-Hardened Omni-Refactor (2026-05-18)

### Phase 1: Security Audit & Threat Scan (v3.17)

- **Leak Prevention Checked**: สแกนหา API key leaks ฝั่ง Client (`"use client"`) ไม่พบการอ้างอิง `NEXT_PUBLIC_SUPABASE_SERVICE` อย่างเปิดเผย (มีการเรียกใช้เป็น fallback ฝั่ง server เท่านั้น)
- **Session Auth Checked**: พบว่าระบบส่วนใหญ่ไม่ได้เรียก `getSession()` ที่มีช่องโหว่
- **AI Payload Checked**: พบช่องโหว่ Prompt Injection ใน `clientContext` ทั้งฝั่ง Client (`AIChatOverlay.tsx`) และฝั่ง Server (`route.ts`)
- **XSS Checked**: พบการดึงข้อมูล `localStorage` ด้วย JSON.parse() ใน `inventory/page.tsx` และ `maintenance/page.tsx` ซึ่งเสี่ยงต่อการถูกแทรกแซง Data Types เพื่อก่อให้เกิด React Rendering Crash

### Phase 2: Vulnerability Mitigation (v3.17)

- **Anti-Prompt Injection**: ติดตั้งระบบกรองและทำความสะอาด (Sanitization) ข้อมูลใน `AIChatOverlay.tsx` ตัดทอน jailbreak keywords และ code blocks และจำกัดความยาว 800 ตัวอักษรก่อนส่ง
- **Server-Side Defense-in-Depth**: เพิ่มระบบคัดกรองซ้อนอีกชั้นใน `route.ts` ดักจับ `clientContext` ป้องกันการโจมตีซ้ำซ้อนจากภายนอก
- **Strict JSON Type Validation (XSS Prevention)**: เสริมเกราะให้ `JSON.parse` ของ `localStorage` ในโมดูล Inventory และ Maintenance ตรวจสอบว่าต้องเป็นโครงสร้าง Plain Object ที่มีค่าเป็น String/Number เท่านั้น (หากเสียจะถูกล้างทิ้งอัตโนมัติ)

### Phase 3: Integrity Validation & Build Pass (v3.17)

- แก้ไขปัญหา Self-healing TypeScript Type Error (แปลง Type ของ Width เป็น String)
- **Compilation Output**: ผ่านการตรวจสอบและ Build ผ่านสมบูรณ์ `Exit Code 0`

---

## v3.16 — Performance-Driven Omni-Refactor (2026-05-18)

### Phase 1: Scan Results (v3.16)

- **Zero font-bold violations found** — Zero-Bold Policy (`font-normal` + `antialiased`) บังคับใช้ครอบคลุม 100% ทุกไฟล์
- **Event Listener Cleanup ผ่าน** — `removeEventListener` มีอยู่ใน `useEffect` cleanup ทั้ง inventory และ maintenance Resizable Columns
- **`maxTokens` ไม่มีการใช้งาน** — AI SDK v6 ใช้ `maxOutputTokens` ถูกต้องสมบูรณ์
- **ตรวจพบ `select('*')` จำนวน 10 จุด ใน 5 ไฟล์** — ต้องแก้ไขทั้งหมด

### Phase 2: Supabase Query Optimization (v3.16)

- **`dashboard/page.tsx`**: ปรับ 3 คิวรี — `profiles` → `id, full_name, dashboard_order`, `shifts` → `id, employee_id, start_time, end_time, status, metadata`, `holidays` → `id, date, name`
- **`schedule/page.tsx`**: ปรับ 3 คิวรี — `profiles` → `id, full_name, schedule_order`, `shifts` → specific 6 fields, `holidays` → `id, date, name`
- **`schedule/ScheduleClient.tsx`**: ปรับ Copy Shifts คิวรี (line 503) → `id, employee_id, start_time, end_time, status, metadata`
- **`inventory-actions.ts`**: ปรับ `fetchTransactionHistory` → `id, inventory_item_id, type, quantity, note, created_at`
- **`maintenance/page.tsx` + `inventory/page.tsx`**: คงไว้ `select('*')` เนื่องจาก Server Component ใช้ทุก field ของ `service_records` และ `inventory_items` อย่างครบถ้วน

### Phase 3: Build Validation (v3.16)

- รัน `npm run build` ผ่านสมบูรณ์ **Exit Code 0** — TypeScript ผ่าน, 20/20 Static Pages สร้างสำเร็จ

---

## v3.15 — Unified Inventory Controls Restructure (2026-05-17)

### Phase 1: Planning & Blueprint Architecture (v3.15)

- Formulated the restructure blueprint in `docs/plans/2026-05-17-control-panel-restructure.md`, `docs/plans/2026-05-17-single-row-buttons.md`, and `docs/plans/2026-05-17-segmented-switch.md`.
- Cleared all markdown lint errors project-wide (resolving heading spacing and list blank line occurrences).

### Phase 2: Horizontal Row Consolidation & Segmented Toggle (R0 Standard) (v3.15)

- **Single-Row Action Buttons:** Compacted the 6 control panel buttons ("รับเข้าสินค้า", "นำออกสินค้า", "บันทึก", "รายการสั่งซื้อ", "เพิ่มสินค้า", "ประวัติ") into a unified `grid-cols-6` frontend grid container to prevent wraps. Scaled down buttons to lightweight `py-2 px-1 text-xs/text-[13px]` proportions with `w-3.5 h-3.5` icons, strictly satisfying the **Zero-Bold Policy** (`font-normal`).
- **Segmented Quick Input Bar:** Collapsed the search box, quantity input box, and IN/OUT selectors into a single horizontal row (`flex flex-row items-center gap-2`). Swapped the separate IN/OUT buttons for a sleek, capsule-shaped **Segmented Control** toggle button.
- **Micro-scale Optimizations:** Rendered numbers and text labels beautifully, keeping 0 values cleanly persisting in the database while leaving empty input strings correctly sanitized, avoiding null or blank crashes.

### Phase 3: Integrity Validation & Build Clean Pass (v3.15)

- Verified 100% compliance of the `AIChatOverlay` `isMounted` hydration guard and typography standards.
- Successfully completed production Next.js compilation (`npm run build`) with exit code 0.

---

## v3.14 — Precision Table Image Capture (2026-05-17)

### Phase 1: Action Planning & Analysis (v3.14)

- Developed layout re-nesting strategy in `docs/plans/2026-05-17-schedule-precision-capture.md`.
- Evaluated why the previous flexbox-1 structure produced extra bottom white spaces on vertical displays.

### Phase 2: DOM Restructuring & Tight Crop (R0 Standard Compliance) (v3.14)

- **Column Alignment Integration:** Nestled both the holiday label row and day-header segments inside the `min-w-[900px]` scrolling element. This resolves small-screen column shifting and aligns them across all screen dimensions.
- **Precision Element Targeting:** Moved `id="blackandbrew-schedule-table"` from the outer full-height flex container to the inner `min-w-[900px] h-fit` grid wrapper. This instructs `html-to-image` to tightly crop the exported file, eliminating the bottom white spaces.
- **Export Style Override:** Injected temporary style overrides (`margin: '0'`, `padding: '0'`, `border: 'none'`, `boxShadow: 'none'`) during rendering to cleanly parse calendar grids without outer margins or drop shadows.

### Phase 3: Integration and Build Clean Pass (v3.14)

- Verified all 8 unit tests passed cleanly via Vitest.
- Completed Next.js production build (`npm run build`) successfully with exit code 0.

---

## v3.13 — Swap Exporter to html-to-image (2026-05-17)

### Phase 1: Action Planning & Analysis (v3.13)

- Developed package management swap plan in `docs/plans/2026-05-17-schedule-image-export-swap.md`.
- Identified limitations of `html2canvas` regarding newer CSS standard parameters (e.g. `oklch()`).

### Phase 2: Dependency Mapping & Refactoring (R0 Standard Compliance) (v3.13)

- **Dependency Swapping:** Cleanly uninstalled `html2canvas` and installed the modern SVG-to-Canvas compiler `html-to-image`.
- **Dynamic Module Safety:** Used dynamic lazy imports inside the client event callback to cleanly prevent SSR crashes:

  ```typescript
  const { toPng } = await import('html-to-image');
  ```

- **Fidelity Specifications:** Mapped the exporter options to `pixelRatio: 2` (double-resolution details) and set the output to `quality: 1.0` in matching cream pastel (`#fdfcf0`) with scale correction `transform: 'scale(1)'`.

### Phase 3: Integration and Build Clean Pass (v3.13)

- Verified all 8 unit tests passed cleanly via Vitest.
- Completed Next.js production build (`npm run build`) successfully with exit code 0.

---

## v3.12 — High-Fidelity Schedule Image Export (2026-05-17)

### Phase 1: Action Planning & Analysis (v3.12)

- Developed the high-fidelity download target tasks in `docs/plans/2026-05-17-schedule-image-export.md`.
- Read and reviewed Visual Standards, Zero-Bold Policy, and dynamic modules rules.

### Phase 2: Refactoring & Dynamic Integration (R0 Standard Compliance) (v3.12)

- **Dependency Integration:** Successfully installed `html2canvas` for precise layout-to-pixel parsing.
- **Dynamic Imports Safety:** Used dynamic lazy imports for `html2canvas` inside the async export function to completely eliminate Next.js server-side compilation issues concerning client-only `window`/`document` models.
- **Export Resolution Control:** Calibrated the canvas scale to `scale: 2` (double-resolution mapping) so that exported PNG schedules remain extremely crisp when zoomed or printed. Styled canvas backdrops in matching cream pastel (`#fdfcf0`).
- **Precision Element Targeting:** Locked target container with `id="blackandbrew-schedule-table"`, cleanly capturing the core schedule grid (Header row, holiday slots, employee cells, daily sum FOH rows) while completely bypassing controls and sidebars.
- **UI Button Integration:** Rendered a modern capsule button next to header controls containing the `Download` icon:

  ```typescript
  "flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-normal text-slate-800 bg-slate-100 hover:bg-slate-200"
  ```

  strictly respecting the **Zero-Bold Policy** (`font-normal`).

### Phase 3: Integration and Build Clean Pass (v3.12)

- Verified all 8 unit tests passed cleanly via Vitest.
- Completed Next.js production build (`npm run build`) successfully with exit code 0.

---

## v3.11 — Purchase Orders Navigation Chips (2026-05-17)

### Phase 1: Action Planning & Analysis (v3.11)

- Developed the modern chip redesign layout tasks in `docs/plans/2026-05-17-po-tabs-refactor.md`.
- Read and reviewed Visual Standards, Zero-Bold Policy, and design instructions.

### Phase 2: Component Refactoring (R0 Standard Compliance) (v3.11)

- **Wrapper Modernization:** Redesigned the categories tab navigation layout in `page.tsx` using `flex flex-wrap gap-2.5 items-center pt-5 pb-4` to present a spacious, fluid navigation bar.
- **Pill-shaped Chips Design:** Completely decoupled the classic underlines (`border-b-2`) and replaced them with rounded navigation capsules (`rounded-full px-4 py-2 border font-normal whitespace-nowrap`).
- **Active state Styling:** Styled the chosen tab chip in soft black background (`bg-[#000000] border-[#000000] text-white shadow-sm`) strictly adhering to the Zero-Bold Policy (`font-normal`).
- **Inactive state Styling:** Styled unselected chips in transparent backgrounds with delicate margins (`border-neutral-200 text-neutral-800 hover:bg-neutral-50`).
- **Hierarchy Counts:** Mapped shift totals (e.g. `(101)`) in distinct `<span>` wrappers, downscaling counts to a lightweight `text-[12px] font-mono font-normal` inside active/inactive states for visual breathing room.

### Phase 3: Integration and Build Clean Pass (v3.11)

- Verified all 8 unit tests passed cleanly via Vitest.
- Completed Next.js production build (`npm run build`) successfully with exit code 0.

---

## v3.10 — Precise Deduplicated Summary Calculations (2026-05-17)

### Phase 1: Action Planning & Analysis (v3.10)

- Outlined the exact shift matching properties and deduplication tasks in `docs/plans/2026-05-17-schedule-summary-deduplication.md`.
- Inspected cell properties inside `ScheduleClient.tsx` to confirm location properties.

### Phase 2: Logic Refactoring (R0 Standard Compliance) (v3.10)

- **Cell Property Alignment:** Inspected grid items and confirmed cell parameters parse `s.metadata?.location` directly.
- **Active Profile Filtering:** Added a containment constraint `s.employee_id && orderedProfileIds.includes(s.employee_id)` to filter out historical shifts from deleted or inactive employees from the daily summary count.
- **Set-Based Deduplication:** Incorporated a deduplication logic mapping matching shifts to employee IDs inside a new `Set(...).size` to avoid counting multiple entries for a single employee on a single day.
- **Aesthetic and Visual Integrity:** Maintained original styling of the visual grid and the FOH totals row.
- **Zero-Bold Policy:** Checked all modified code segment properties to ensure zero bold styles are used.

### Phase 3: Integration and Build Clean Pass (v3.10)

- Verified all 8 unit tests passed cleanly via Vitest.
- Compiled the full Next.js production build (`npm run build`) successfully with exit code 0.

---

## v3.9 — Strict Shift Count Validation (2026-05-17)

### Phase 1: Action Planning & Analysis (v3.9)

- Outlined the strict work shifts summary task in `docs/plans/2026-05-17-schedule-summary-logic.md`.
- Identified `ScheduleClient.tsx` bottom-most summary calculations row for modification.

### Phase 2: Refactoring & Logic Integration (R0 Standard Compliance) (v3.9)

- **Strict Calculations Logic:** Formed the `VALID_WORK_SHIFTS` constant array: `['6:30', '7:00', '8:00']`.
- **Filtering Shift Constraints:** Rewrote the daily totals counter `fohCount` to count only when the shift's metadata location falls within `VALID_WORK_SHIFTS` and the shift is not marked as `on_leave`.
- **Aesthetic and Visual Integrity:** Ensured other specific shift designations (`ร้านซักผ้า`, `ไปสาขา 2`) are fully preserved in the rendering cells, modifying only the summation calculations row.
- **Zero-Bold Policy:** Maintained zero bold styling inside the summation grid block.

### Phase 3: Integration & Validation Checks (v3.9)

- Executed the full Vitest suite (`8/8 tests passed successfully`).
- Completed Next.js production bundler check successfully (`npm run build` completed with static route optimizations and exit code 0).

---

## v3.8 — Typography Refinement & Contrast Tuning (2026-05-17)

### Phase 1: Planning and Component Refactoring (v3.8)

- Created the design polish task schedule in `docs/plans/2026-05-17-typography-contrast.md`.
- Refactored `AIChatOverlay.tsx` to calibrate typographical weight hierarchy.

### Phase 2: Design Integrity (R0 Standard Compliance) (v3.8)

- **Typography Weight Calibration:** Scaled the chat bubble text weight down from `font-normal` (400) to `font-light` (300) and embedded the CSS `antialiased` utility, ensuring that the larger `text-[15px]` letters appear sleek, crisp, and beautifully proportioned on all screens.
- **Deep Coffee Contrast tuning:** Boosted secondary captions ("AI ผู้ช่วยร้าน BLACKANDBREW" and the "กำลังคิด..." status label) from a generic transparent black (`text-[#000000]/40`) to a high-contrast `#1a1a1a` Dark Coffee shade, which provides superior visibility under varying coffee shop lighting conditions.
- **Logo Symbol Re-check:** Verified that all SVG imports cleanly render `/ai-agent-logo.svg` without rendering artifacts.
- **Zero-Bold Audit:** Verified that Zero-Bold policy constraints are fully satisfied across all modified components.

### Phase 3: Integration and Build Clean Pass (v3.8)

- Verified all 8 unit tests passed cleanly via Vitest.
- Compiled the full Next.js production build (`npm run build`) successfully with exit code 0.

---

## v3.7 — AI Agent UI Polish & Interaction (2026-05-17)

### Phase 1: Action Planning & TDD Verification (v3.7)

- Drafted the UI polish task schedule in `docs/plans/2026-05-17-ai-agent-ui-polish.md`.
- Cleared the unused `MessageCircle` import from `lucide-react` at the top of `AIChatOverlay.tsx`.

### Phase 2: High-Density UI Upgrades (R0 Standard Compliance) (v3.7)

- **Floating Button Swap:** Replaced generic `MessageCircle` closed-state trigger icon with a pure white branding logo (`/ai-agent-logo.svg` + inverted filter) rendering inside the floating circular button.
- **Bubble Text Scaling:** Scaled the chat bubble font size up from `text-[13px]` to `text-[15px]` to maximize reading comfort on mobile screens and tablets, strictly maintaining standard typography `font-normal` (Zero-Bold Policy).
- **Click Outside to Close:** Added an invisible backdrop transition wrapper (`fixed inset-0 z-[198] bg-black/0`) within the `<AnimatePresence>` block so that clicking on empty space immediately closes the active overlay panel.

### Phase 3: Validation and Build Clean Pass (v3.7)

- Resolved a React fragment hierarchy syntax edge case before final checks.
- Executed the full Vitest command line suite (`8/8 tests passed successfully`).
- Ran and completed the Next.js production build (`npm run build` completed with static route optimizations and exit code 0).

---

## v3.6 — AI Agent Custom Branding Logo (2026-05-17)

### Phase 1: Planning and Component Refactoring (v3.6)

- Created the logo update plan `docs/plans/2026-05-17-ai-agent-logo.md`.
- Refactored `AIChatOverlay.tsx` by removing the generic Lucide `<Bot />` icon and importing Next.js `<Image />` component.
- Implemented `/ai-agent-logo.svg` across all 3 key branding elements: the chat header, the typing indicator, and the assistant message avatar.
- Preserved perfect layout symmetry with rounded borders and correct size classes (`w-6 h-6` for header, `w-5 h-5` for bubble/loader avatars).

### Phase 2: Design and Build Integrity Check (v3.6)

- Verified compliance with the **Zero-Bold Policy** across all modified files.
- Executed and passed all 8 unit tests in the Vitest suite.
- Built the Next.js production app successfully using `npm run build` with zero issues or warning logs.

---

## v3.5 — Persistent Date Range via Cookies (2026-05-17)

### Phase 1: Failing Test Design (TDD Red Phase) (v3.5)

- Created `src/test/dashboard_date_cookies.test.ts` to assert that:
  1. Client-side cookie setting functions correctly update `document.cookie` with selected date parameters.
  2. The server-side resolution follows the hierarchical priority: URL search params > saved cookies > Monday-Sunday fallback default.

### Phase 2: Component Refactoring (TDD Green Phase) (v3.5)

- **Client Component (`LiveShiftList.tsx`):** Added logic in `handleDateChange` to set `dashboard_start_date` and `dashboard_end_date` cookies with 1-year max-age and `SameSite=Lax` constraint prior to URL search parameter navigation.
- **Server Component (`dashboard/page.tsx`):** Integrated Next.js `cookies()` parser into the server-rendered dashboard page. Replaced URL parameter fallback with a chain checking URL search parameters first, then cookies, and finally the current week.

### Phase 3: Integrity Validation & Daily Closing (v3.5)

- **Tests:** Executed and passed all 8 tests in the suite successfully (Vitest exit code 0).
- **TypeScript & Build:** Ran Next.js production build (`npm run build`) successfully with zero type checking or optimization warnings.
- **Zero-Bold Policy:** Confirmed zero bold font weight violations in all newly added or modified code segments.

---

## v3.4 — Project-Wide Omni-Refactor & AI Sync (2026-05-17)

### Phase 1: Architectural Scan (v3.4)

- Scanned `src/`, `public/`, `sql/`, and root config files.
- Identified 4 issues: 3 orphaned files in `src/lib/agent-tools/`, 1 empty type stub, 1 Zero-Bold violation, and missing `isMounted` guard in AI overlay.

### Phase 2: Dead Code & Junk Purge (v3.4)

- **Deleted:** `src/lib/agent-tools/fs_tool.ts` — not imported anywhere in codebase.
- **Deleted:** `src/lib/agent-tools/search_proxy.ts` — not imported anywhere in codebase.
- **Deleted:** `src/lib/agent-tools/shell_tool.ts` — not imported anywhere in codebase.
- **Deleted:** `src/types/supabase.ts` — empty 0-byte file (placeholder stub, no content).

### Phase 3: AI Optimization Check (v3.4)

- **Verified:** `route.ts` uses `providerOptions.google.generationConfig.maxOutputTokens` ✅
- **Verified:** All tools use `inputSchema` (Vercel AI SDK v6 standard) ✅
- **Verified:** Sliding window memory (`messages.slice(-4)`) in place to prevent token bloat ✅
- **Verified:** Surgical tool partitioning with column-selected queries and `.limit(8)` ✅
- **Security:** AI route reads via Supabase Security Definer RPCs (`get_ai_store_status`, `get_ai_inventory_item_details`) — anon key cannot bypass RLS on write operations ✅

### Phase 4: Visual & Hydration Enforcement (v3.4)

- **Zero-Bold Fix:** Changed `font-medium` → `font-normal` on "บรู" name label in `AIChatOverlay.tsx` (line 90).
- **Hydration Guard:** Added `isMounted` state with `useEffect` to `AIChatOverlay.tsx` to prevent browser-only globals from running during SSR.
- **Build:** `npm run build` → **Exit Code 0** ✅

---

### AI Assistant "บรู" Frontend (v3.4)

- **Chat Overlay UI:** Created `src/components/ai/AIChatOverlay.tsx` with a pastel theme, compact dimensions (max-h-[70vh], overflow-y-auto), bottom-right positioning, Framer Motion open/close animations (0.2s), and `isMounted` protection for prerendering. The component was directly integrated into `src/app/[locale]/layout.tsx` and the redundant `AIChatWrapper.tsx` was removed.
- **Typography Enforcement:** Implemented a strict "no bold text" policy for all chat messages and inputs, using `font-normal` or `font-medium` to maintain consistent aesthetic standards.
- **Impact:** Provided a visually appealing and functional chat interface for the AI Assistant, ensuring a smooth user experience and adherence to design guidelines.
- **Evidence:** `src/components/ai/AIChatOverlay.tsx`, `src/app/[locale]/layout.tsx`

### AI Assistant "บรู" Backend (v3.4)

- **Read-Only Views and RPCs:** Created `view_today_shifts` and `view_inventory_summary` for safe, summarized data access. Implemented `get_ai_store_status` and `get_ai_inventory_item_details` RPCs in Supabase to provide comprehensive, controlled data to the AI assistant.
- **API Route Handler:** Developed `src/app/api/chat/route.ts` using Vercel AI SDK v6. Ensured compliance with AI SDK v6 standards by utilizing `providerOptions.google.generationConfig.maxOutputTokens` and `inputSchema` for tools, including the new inventory item details RPC.
- **Impact:** Enabled secure and efficient data access for the AI Assistant, adhering to modern AI SDK standards and promoting maintainability.
- **Evidence:** `sql/ai_agent_views.sql`, `src/app/api/chat/route.ts`

## v3.2 — Typography & UI Optimization (2026-05-16)

### High-Legibility Scaling (R0 Standard) (v3.2)

- **Typography Scale-up (+2 Sizes):** อัปเกรดขนาดตัวอักษรของหัวข้อย่อย (Sub-labels) และป้ายกำกับฟิลด์ (Input Labels) จาก `text-[11px]` เป็น **`text-[13px]/text-[14px]`** ทั่วทั้งระบบ
- **Space Integrity Guard:** ปรับลด Padding และ Margin แบบสัดส่วนผกผันเพื่อให้หน้าต่าง Modals ยังคงความกะทัดรัด (One-Shot View)
- **Zero-Bold Policy Enforcement:** บังคับใช้ `font-normal` และ `font-medium` ทั่วทั้งแอปพลิเคชัน ห้ามใช้ตัวหนาเด็ดขาด
- **Documentation Standard:** อัปเดต `docs/rules.md` และ `docs/design.md` เพื่อใช้เป็นกฎเหล็กสำหรับ AI Agent ในอนาคต

### System-Wide Big Cleaning & Audit (R0 Standard) (v3.2)

- **Syntax & Code Smells:** Removed unused `Tool` import in `maintenance/page.tsx` resolving a critical TypeScript build error. Purged all debug `console.log` statements across `inventory-actions.ts`, `shift-actions.ts`, `ScheduleClient.tsx`, and `search_proxy.ts` for clean production terminal output.
- **Security & Error Boundary:** Fixed a potential crash in `shift-actions.ts` by adding optional chaining (`firstError.error?.message`) to prevent null-reference TypeErrors during DB synchronization.
- **React & Build Optimization:** Verified complete dependency array integrity across all hooks. Achieved 100% successful `npm run build` with zero linting or TS errors.
- **UI Integrity Verified:** System-wide scan confirmed 0 instances of `font-bold` or `font-semibold`. The "Zero-Bold Policy" and "DOM Separation" for DnD remain uncompromised.

## v3.2 — Performance & DnD Stabilization (May 2026)

### Interaction Mirroring (R0 Standard) (v3.2)

- Implemented **Perfect Mirroring** of DnD interactions from Inventory to Dashboard and Schedule.
- Enforced precision sensors (**distance: 5px**) and **closestCorners** collision detection system-wide.
- Integrated **Framer Motion Layout** for smooth card/row "Gliding" animations.
- Unified spring physics (**stiffness: 300, damping: 30**) across all sortable components.

### Data & Persistence (v3.2)

- Fixed "Drag-and-Drop bounce-back" in Schedule by syncing column targets to `schedule_order`.
- Transitioned all list reordering to **Service Role Server Actions** to bypass RLS latency.
- Enforced high-legibility standards with **pure black (#000000)** text on pastel backgrounds.

### Documentation & Governance (v3.2)

- Established **MASTER_BLUEPRINT.md** as the definitive architectural single source of truth.
- Completed **Daily Closing Integrity Workflow [R0]** with 100% build pass.

---

## v3.1 — System Rebirth & Staff Access Refinement (May 2026)

### Transaction System Rebirth (v3.1)

- Implemented **Two-Step Fetch** strategy for transaction history — bypasses FK join and RLS silent failures
- Applied `unstable_noStore()` cache buster for all transaction queries
- Renamed column `product_id` → `inventory_item_id` via migration script
- Added comprehensive server-side telemetry (`console.log`) for deep debugging
- Fixed UI mappings in history modal for accurate data display

### Staff Dashboard (v3.1)

- Removed restricted "Inventory Management" shortcuts from Staff Dashboard
- Established root redirect `/` → `/th` via `src/app/page.tsx`

### Standards (v3.1)

- Enforced `inventory_item_id` naming across all Server Actions and queries
- Verified Two-Step Fetch eliminates silent failures in transaction reporting
- Footer badge: `System Rebirth v3.1`

---

## v3.0 — The Great Purge: Zero-Waste Architecture (May 2026)

### Dead Code Elimination (v3.0)

- Removed 14+ orphaned files: `mem0.py`, `gemini.ts`, `token-utils.ts`, `memory.ts`, debug scripts
- Purged `__pycache__/`, `grep_ast/`, broken `[locale` bracket directory, empty `staff/` route
- Removed dead `src/app/api/` tree

### Dependency Cleanup (v3.0)

- Uninstalled 3 unused npm packages: `js-tiktoken`, `tokentracker-cli`, `@google/genai`
- Reduced `node_modules` by 39 packages

### Technical Fixes (v3.0)

- Fixed TypeScript type narrowing in inventory `onBlur` handler
- Fixed duplicate interface property in `ScheduleClient.tsx`
- Migrated inventory grid from flex-based layout to standard HTML `<table>`/`<tr>`/`<td>`
- Fixed React hydration error by moving `<DndContext>` outside `<tbody>`
- Verified clean `next build` — zero errors across all 5 route modules

---

## v2.6 — High-End Inventory Grid (May 2026)

### Undo/Redo Stability (v2.6)

- Refactored history engine with snapshot-based persistence
- Resolved "two-click" desync bug
- Implemented state-locking during database sync (`isSyncing`)

### Numeric Formatting (v2.6)

- Integrated "Smart Sanitizer" for leading zeros (05 bug)
- Fixed empty-string Supabase errors for numeric columns

### UI Enhancements (v2.6)

- Applied "Super-Soft Pastel" theme with `rounded-3xl`
- Full-form "Add Item" modal with 2-column grid
- Custom confirmation dialogs (replaced browser `alert()`)

---

## v2.2 — Global Omni-Refactor (May 2026)

### UI Architecture (v2.2)

- Flattened all overlapping DOM structures
- Native inputs hidden using `sr-only` for accessibility + styling control

### Data Integrity (v2.2)

- Implemented "Safe Deletion" globally (shifts before profiles — FK safety)
- Optimistic UI triggers instantly using `.filter()`

### Aesthetics (R0 Constraints) (v2.2)

- Eradicated all `font-bold` and `font-semibold` (app-wide `font-normal`)
- Unified text colors: primary `#000000`, secondary `#4b5563`

### System Cleanup (v2.2)

- Purged deprecated testing scripts
- Cleaned `.gitignore`
- Streamlined Next.js server actions

---

## v2.0 — Foundation (May 2026)

### Core Setup (v2.0)

- Initialized Next.js 16 with App Router
- Configured Supabase with Thailand Edge Region
- Setup Tailwind CSS 4 with PostCSS
- Implemented i18n via `next-intl` (th/en)

### Modules Built (v2.0)

- Dashboard (Command Center) with LiveShiftList
- Schedule with Drag-and-Drop shift management
- Inventory with spreadsheet-style inline editing
- Maintenance equipment tracking

### Database (v2.0)

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
