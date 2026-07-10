# Rules — BLACKANDBREW ERP

> Version: 9.1 | Last Updated: 2026-07-10 | Enforcement: Mandatory

---

## 1. Naming Conventions

### Database Tables

| Rule | Example | Anti-pattern |
| --- | :--- | --- |
| Plural table names | `inventory_items`, `inventory_transactions` | ~~`inventory_item`~~, ~~`inventory_transaction`~~ |
| Snake_case columns | `inventory_item_id`, `order_qty`, `target_stock` | ~~`inventoryItemId`~~, ~~`orderQty`~~ |
| UUID primary keys | `id UUID DEFAULT gen_random_uuid()` | ~~`id SERIAL`~~ |

### Critical Column Names (VERIFIED — DO NOT CHANGE)

| Table | Column | Notes |
| --- | :--- | --- |
| `inventory_transactions` | `inventory_item_id` | FK to `inventory_items.id` — renamed from `product_id` |
| `inventory_items` | `stock`, `order_qty`, `order_point`, `target_stock` | NUMERIC type, sanitize empty → 0 |
| `inventory_items` | `count_policy` | `exact_count` or `sufficiency_check`; controls count accuracy and manual PO quantity |
| `inventory_items` | `sort_order` | INTEGER, controls drag-and-drop ordering |
| `inventory_config` | `settings` | JSONB containing `order`, `labels`, `widths` |
| `push_subscriptions` | `profile_id`, `branch_id` | Daily schedule Web Push filtering; `branch_id` defaults to `main` |

### TypeScript/React

| Rule | Example | Anti-pattern |
| --- | :--- | --- |
| PascalCase components | `EditableCell`, `SortableRow` | ~~`editableCell`~~ |
| camelCase functions | `handleSaveField`, `fetchTransactionHistory` | ~~`HandleSaveField`~~ |
| Interface prefix: none | `InventoryItem`, `ColumnDef` | ~~`IInventoryItem`~~ |
| Server Actions: `'use server'` | Top of file declaration | ~~Inline directive~~ |

### Files & Routes

| Rule | Example |
| --- | :--- |
| Locale-prefixed routes | `/[locale]/inventory/` |
| Feature-only UI | `src/app/[locale]/<feature>/_components/` |
| Actions in `/actions/` | `src/app/actions/inventory-actions.ts` |
| Shared components (2+ features) | `src/components/ui/button.tsx` |
| Utility functions in `/lib/` | `src/lib/supabase.ts` |

---

## 2. Code Style Rules

### Typography (STRICT)

- ❌ **FORBIDDEN:** `font-bold`, `font-semibold`, `font-black`, `font-extrabold`
- ✅ **REQUIRED:** `font-normal` (weight 400) for all text (Zero-Bold Policy)
- ✅ **ALLOWED:** `font-medium` (weight 500) only for emphasized data labels
- ✅ **SUB-LABEL STANDARD:** ทุกหัวข้อย่อย (Sub-labels) และป้ายกำกับฟิลด์ (Input Labels) ต้องใช้ขนาดฟอนต์เริ่มต้นที่ **`text-sm` (14px)** หรือขั้นต่ำ **`text-[13px]`** เพื่อความคมชัด
- ❌ **NO BOLD IN DOCS:** Do not use bold tags in documentation that will be rendered on the UI.
- ⚠️ **AUTO-GENERATION:** ทุกการสร้างโค้ดอัตโนมัติโดย AI ห้ามให้มี `font-bold` หลุดเข้ามาใน UI เด็ดขาด และต้องรักษาขนาดฟอนต์หัวข้อย่อยตามมาตรฐานข้างต้น

### Drag & Drop (Interaction Standard)

- ✅ **DOM SEPARATION:** Always separate DnD control from Framer Motion. Use an outer `div` (Wrapper) for `ref={setNodeRef}` and an inner `motion.div` for UI animations.
- ✅ **TRANSLATE PRIORITY:** Use `CSS.Translate.toString(transform)` for sortable items to prevent scaling conflicts with Framer Motion's `whileHover`.
- ✅ **FRICTIONLESS GLIDE:** Use custom cubic-bezier transitions (`250ms cubic-bezier(0.2, 0, 0, 1)`) for layout shifts to ensure smooth card gliding.
- ✅ **SENSORS:** Standardize `PointerSensor` with `distance: 10` for all grid-based reordering.

### CSS Classes (Aesthetic Enforcer)

- ✅ `rounded-3xl` for all buttons, cards, modals, inputs
- ✅ **Theme tokens** for page/modal surfaces: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`
- ✅ **Pastel accent cards:** keep pastel hex backgrounds + mandatory `bb-pastel-surface` (or `PASTEL_SURFACE` from `shift-colors.ts`) — black text/icons in both themes
- ❌ **FORBIDDEN on non-pastel surfaces:** hardcoded `bg-[#fdfcf0]`, `bg-white`, `text-black`, `text-[#000000]`, `border-black/5`
- ✅ `#000000` text only inside `.bb-pastel-surface` or explicit pastel-active inputs (e.g. count cell on green card)
- ✅ `transition-all duration-300` for hover effects

### Data Handling

- ❌ Never send empty string `""` to NUMERIC columns
- ✅ Sanitize: `const sanitized = value === "" ? 0 : Number(value)`
- ✅ Strip leading zeros: `replace(/^0+(?=\d)/, '')`
- ✅ Display 0 as empty string `""` in UI inputs (Zero-Display Logic)
- ✅ Wrap all Supabase calls in try/catch with detailed logging

---

## 3. Workflow Rules

### Data Sync Standard

- Every data change (Add/Update/Delete) must trigger immediate DB update
- Use functional updates: `setItems(prev => [...prev, newItem])`
- Optimistic UI: update local state immediately, sync DB in background
- Rollback on failure: restore previous state if DB sync fails

### Spreadsheet UI Rules

- Direct cell editing via native `<input>` in `<td>` elements
- Auto-save on `onBlur` and `onKeyDown={Enter}`
- Enter key → focus next row (Google Sheets navigation)
- No "Edit" buttons or modals for simple grid data
- ✅ **STATIC TABLE INDEX:** ตารางที่มีการลากวาง (Sortable Table) ต้องมีคอลัมน์ลำดับแถว (#) ที่ **คงที่ (Static)** โดยตัวเลขต้องไม่เลื่อนตามการลากวาง เพื่อให้ผู้ใช้ทราบตำแหน่งแถวที่แน่นอนเสมอ
- ✅ **INDEX LOGIC:** ใช้ Loop Index (`index + 1`) ในการแสดงผล และแยกสไตล์ `transform` ออกจากคอลัมน์ลำดับนี้
- ✅ **PURE ICONOGRAPHY TYPE:** คอลัมน์ "ประเภท" ในตารางประวัติการเคลื่อนไหว (History) ต้องใช้เฉพาะไอคอนล้วนในกรอบพาสเทล **ห้ามมีตัวอักษร** โดยใช้ไอคอน `PackagePlus` (IN) และ `PackageMinus` (OUT) เพื่อความชัดเจนและมินิมัล

### Transaction Integrity

- Quick Entry IN/OUT MUST go through `record_inventory_transaction` RPC
- Absolute stock edits (warehouse cell, stock-taking) MUST go through `updateInventoryStock()` → `set_inventory_stock` RPC
- `exact_count` items record accuracy rows; `sufficiency_check` items MUST skip accuracy scoring and use manual `order_qty`
- Realtime handlers MUST use `mergeInventoryRealtimeUpdate()` — never replace full row with partial payload
- Transactions MUST NEVER use UI Undo/Redo stack
- Undo/redo upsert MUST NOT overwrite live `stock` from DB (fetch current stock before sync)
- Corrections via compensating transaction or explicit deletion in History
- Transaction cancellation reverses stock manually + deletes record
- Transaction history uses a **two-step fetch** (raw transactions + separate item-name lookup) to avoid FK join / RLS gaps; use `unstable_noStore()` for transaction reads
- Explicit joins on `inventory_item_id` only — never `product_id` / singular table names

### Table & Modal Layout (DEC-056–058)

- Tables: wrap with `w-full overflow-x-auto scrollbar-thin border border-border rounded-3xl pb-8`; set sensible `min-width`; compact cell padding (`px-2 py-2`)
- Modals: content `max-h-[90vh] overflow-y-auto scrollbar-thin`; overlay `flex items-center justify-center p-4`

### Employee Roster Integrity (DEC-059)

- Dashboard/overview staff tables always render from `profiles` (all 9 staff), never by mapping only from `shifts`

### Purchase Orders & Ordering

- Item names left-aligned; other PO columns centered; group by source via tabs
- `exact_count`: order qty = `target_stock - stock` when `stock <= order_point`, else `0`
- `sufficiency_check`: manual `order_qty`; skip accuracy scoring

### Drag & Drop

- `PointerSensor` `activationConstraint: { distance: 5 }`; optimistic local update + background sync with rollback
- In-place drag (`opacity` / `scale` / `shadow`); no `<DragOverlay>` ghost duplicate; use `CSS.Translate` on the sortable item

### Persistent Layout State

- Column widths / labels: `localStorage` first (no layout shift), then sync `inventory_config`
- Dashboard date range: URL params > cookies (`SameSite=Lax`) > defaults
- Rapid resize/save: functional `setState` only — never stale outer closures

### Performance Guardrails (v9.0)

- Dashboard shift-query consolidation is allowed only when the combined payload is split back into exact weekly and monthly ranges.
- Inventory row containment must not alter spreadsheet layout, touch targets, realtime subscriptions, undo behavior, or numeric zero-display logic.
- Modal-only code should be dynamically loaded where safe; use hover/focus preload for user intent instead of mounting hidden modal surfaces on route load.

### Motion & Animation (v6.9)

- ✅ Use shared presets from `src/lib/motion-presets.ts` for framer-motion modals
- ✅ Use CSS classes `.bb-modal-backdrop`, `.bb-modal-panel`, `.bb-sheet-panel`, `.bb-transition` from `globals.css`
- ✅ Route transitions via `<PageTransition>` in `SidebarLayout` only — do not wrap layout shell
- ❌ Never animate width/height/margin in ways that shift desktop/mobile layout
- ✅ Micro-interactions: `transition-all duration-200 ease-in-out` on buttons, links, inputs

### Date & Timezone

- All DB timestamps: `TIMESTAMPTZ` (stored as UTC)
- All display: Converted to GMT+7 (Bangkok) via `toLocaleString('th-TH')`
- Never use raw UTC dates in UI

### Date Picker & PWA Accessibility Rules

- ✅ **DatePicker Hitbox**: สำหรับ Input ประเภทวันที่ (Date Picker) ทั้งหมด ต้องทำให้พื้นที่ทั้งหมดของกรอบ Input Container สามารถคลิกได้ (Full-width clickable area) ไม่จำกัดเฉพาะการคลิกที่ไอคอน
- ✅ **Capsule Design Consistency**: ปุ่มและเมนูปฏิทินต้องออกแบบเป็นทรงแคปซูลสวยงาม เข้ากับรูปแบบพาสเทล
- ✅ **iOS Safe Zone Compliance**: บนอุปกรณ์มือถือ (Viewport < md) หน้าต่างปฏิทินแบบ Popover/Modal และแถบนำทางส่วนท้าย ต้องชดเชยระยะปลอดภัยด้านล่างด้วย `env(safe-area-inset-bottom)` เสมอ เพื่อไม่ให้ถูกปุ่มระบบของ iOS บดบัง
- ✅ **Service Worker Strategy**: ทุกการทำงานของ Service Worker สำหรับเส้นทางแบบไดนามิก (Dynamic shifts/schedules) ต้องเป็นแบบ Network-First เสมอเพื่อดึงข้อมูลตารางงานล่าสุดที่ถูกต้อง และห้าม Cache ข้อมูลตารางงานที่ออฟไลน์แล้วค้างคาคาดเคลื่อน

### Environment Variables

- ❌ Never prefix secret keys with `NEXT_PUBLIC_`
- ❌ Never commit `.env.local` to Git
- ✅ Copy `.env.example` → `.env.local` for local setup
- ✅ Set Vercel env vars from `.env.example` for deployment

### AI Workflow (One-Shot Execution Rule)

- ✅ **COMPLETE AUTONOMY:** AI ต้องเขียนโค้ด ทดสอบ และแก้ไข Syntax Error ให้เสร็จสิ้น 100% ก่อนรายงานผล
- ✅ **SELF-VALIDATION:** ห้ามหยุดรอกดอนุมัติระหว่างขั้นตอนการแก้ไขเล็กน้อย (เช่น ปิด Tag, แก้ Lint)
- ✅ **ZERO-STUTTER:** รายงานผลเฉพาะเมื่อบรรลุ Milestone หรือพบ Error ระดับ R2 ที่ต้องตัดสินใจร่วมกันเท่านั้น

---

## 4. Build & Deploy Rules

- `npm run build` must exit with code 0 before any deployment
- All TypeScript errors must be resolved (strict mode)
- Secret check must pass before `git push`
- `.gitignore` must include: `.env.local`, `.next/`, `node_modules/`
