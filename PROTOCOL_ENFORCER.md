# PROTOCOL ENFORCER

## System Rebirth - Transaction Integrity

- **Standard**: Transaction history system uses a **two-step fetch** strategy (raw transactions + separate item name lookup) to bypass FK join and RLS complications.
- **Cache Policy**: Always use `unstable_noStore()` to bypass Next.js caching for transaction data.
- **Column Standard**: Explicit joins on `inventory_item_id` are mandated. UI Undo is bypassed for financial/stock records to maintain ledger accuracy.
- **Error Transparency**: All Supabase errors must be logged with `message`, `details`, and `hint` for immediate debugging.

## Transactional Integrity

- **Standard**: Quick Entry IN/OUT MUST use Postgres RPC (`record_inventory_transaction`). Absolute stock edits (warehouse cell, stock-taking) MUST use `updateInventoryStock()` → RPC `set_inventory_stock`.
- **Implementation**: Stock IN/OUT via single DB transaction with ledger entry. Absolute stock SET via `set_inventory_stock` with delta ledger when quantity changes.
- **Realtime**: All inventory realtime handlers MUST use `mergeInventoryRealtimeUpdate()` — never replace full row with partial payload.
- **Atomicity**: If either the update or the insertion fails, the entire operation must rollback to maintain audit trail accuracy.

## Ledger Integrity

- **Standard**: Financial/Stock transactions MUST NEVER use the UI Undo/Redo stack.
- **Implementation**: Mistakes must be corrected via compensating transactions or explicit deletion in the History ledger. This prevents database deadlocks and maintains absolute audit trail accuracy.

## Table Responsiveness Standard (DEC-056/057)

- **Standard**: ทุกตารางข้อมูล (รวมถึงบน Desktop และ Modal) ต้องไม่ล้นขอบคอนเทนเนอร์และรองรับการเลื่อนในแนวนอน
- **Implementation**:
  1. ต้องห่อหุ้มตารางด้วย `<div className="w-full overflow-x-auto scrollbar-thin border border-black/5 rounded-3xl pb-8">` เสมอ (เพิ่ม pb-8 เพื่อกัน Scrollbar บังเนื้อหา)
  2. ตัวตารางต้องมี `w-full` และ `min-width` ที่เหมาะสม (เช่น `min-w-[1000px]` สำหรับตารางจัดการกะ)
  3. ปรับลด Padding ของเซลล์ให้กระชับ (`px-2 py-2` หรือ `p-2`) เพื่อความหนาแน่นของข้อมูลที่เหมาะสม
  4. บังคับใช้ `text-black` และ `font-normal` ตาม Zero-Bold Policy 100%

## Employee Data Integrity (DEC-059)

- **Standard**: ตารางแสดงผลพนักงาน (Overview/Dashboard) ต้องแสดงรายชื่อครบทั้ง 9 คนเสมอ
- **Implementation**: ห้ามใช้การ `.map` จาก Array ของกะงาน (Shifts) ให้ใช้รายชื่อพนักงานจาก `profiles` เป็นตัวตั้งหลักในการเรนเดอร์เสมอ หากไม่มีกะงานให้แสดงสถานะว่าง

## Modal Vertical Centering & Overflow (DEC-058)

- **Standard**: หน้าต่างย่อย (Modal) ต้องไม่ยืดตัวจนล้นขอบจอแนวตั้ง และต้องอยู่กึ่งกลางหน้าจอเสมอ
- **Implementation**:
  1. บังคับใช้ `max-h-[90vh]` และ `overflow-y-auto scrollbar-thin` ที่กล่องเนื้อหาหลัก (White Box)
  2. บังคับใช้ `flex items-center justify-center p-4` ที่ Overlay ฉากหลัง

## PO Interface Standards

- **Standard**: Item names are left-aligned; all other PO data is centered.
- **Implementation**: Large datasets must be segmented by Source via a Tabbed Interface to minimize scrolling and provide a Focused View.
- **Aesthetic**: Modal uses `bg-[#fdfcf0]`, `rounded-3xl`, and `border-black/5` with Mono font for numeric alignment.

## Automated Ordering Standards

- **Standard**: Order Quantity is a computed field based on stock/order_point triggers. Manual overrides are disabled.
- **Logic**: `IF stock <= order_point THEN computedOrderQty = target_stock - stock ELSE 0`.
- **UI Element**: Purchase Orders must be displayed in a consolidated view grouping by source for ease of procurement.

## State Resolution Standard

- **Standard**: Never pass outer state (stale closure) directly into save functions during rapid updates (Drag/Resize).
- **Implementation**: Always use Functional Updates (`setColumns(prev => ...)`) to resolve the latest state before persisting.
- **Workflow**: For Column Resizing, use `onResizeEnd` to capture the final state and trigger persistence with the resolved functional state.

## Database Access Standards

- **Standard**: All authenticated staff (Managers/Owner) have full CRUD permissions on `profiles` and `shifts` tables.
- **Verification**: Always verify Foreign Key relationships in Supabase when performing joins in server actions to prevent empty result sets. Ensure column names (e.g., `inventory_item_id`) match the standardized schema.
- **Join Queries**: Join queries between inventory_transactions and inventory_items are now strictly aligned with the `inventory_item_id` foreign key.

## Naming Standards

- **Standard**: Explicitly use `inventory_transactions` and `inventory_item_id`.
- **Constraint**: Singular/Plural mismatches (e.g., `inventory_transaction` or `item_id`) are strictly forbidden to ensure direct mapping with Supabase schema.
- **RLS Policy**: Row Level Security must be enabled but configured with `FOR ALL TO authenticated USING (true) WITH CHECK (true)` to allow collaborative data management.
- **Collaborative Logic**: Frontend must allow editing of any profile or shift for authenticated users, removing restrictions based on `auth.uid()`.

## Persistent UI States

- **Standard**: All user-customized layout changes (width, sort order, labels) and dashboard date filters must persist across refreshes.
- **Implementation**:
  - Use `localStorage` for immediate, zero-latency persistence (e.g., `inventory-column-widths`).
  - Use secure `cookies` (`SameSite=Lax`, Max-Age 1 year) for server-rendered persistent states that must be resolved prior to data fetching (e.g., dashboard date range).
  - Sync to Supabase `inventory_config` (id: `column_labels`) for cross-device consistency.
- **Fast Load**: Initialization must prioritize `localStorage` to prevent Layout Shift, followed by database synchronization. For cookie-backed states, server components must resolve the value in a priority hierarchy: URL Params > Cookies > Fallback defaults.

## Transaction & Search Integrity

- **Search UI**: Hover-based activation for search results is strictly prohibited.
- **Search Behavior**: Search results (Product List) must only show during active input and must be displayed as a modular dropdown below the search box.
- **Search Styling**: Use Black-on-Pastel theme (`bg-[#fdfcf0]`, `#000000`, `rounded-3xl`, subtle shadow).
- **Transaction Logic**: Transaction history must update the running balance atomically. Use Postgres RPC (`record_inventory_transaction`) to ensure zero-guard and prevent race conditions.

## High-Performance Drag Standards (World-Class Velocity)

- **Sensor Distance**: `PointerSensor` must use `activationConstraint: { distance: 5 }` to prevent accidental drags.
- **Animation Timing**: Use `transition: transform 150ms cubic-bezier(0.2, 0, 0, 1)` for snappy, professional item swapping.
- **Rendering Optimization**: All sortable rows must be wrapped in `React.memo` to prevent redundant re-renders.
- **Hardware Acceleration**: Draggable items must include `will-change: transform` to trigger GPU acceleration.
- **Optimistic UI**: All DND operations must update local state immediately (Zero Latency) and handle Supabase sync in the background.
- **Rollback Logic**: Every background sync must be wrapped in a try/catch block with explicit rollback to the previous state on failure.

## Visual Drag Standard (In-Place Visibility)

- **Standard**: Drag state must keep row data visible in its original position ("In-Place").
- **Styling**: When `isDragging` is true, apply `opacity: 0.7`, `scale: 1.02`, and `shadow-xl`.
- **Z-Index**: Ensure the dragging row has `z-index: 100` to float above other rows.
- **Component**: `<DragOverlay>` must remain removed to prevent duplicated ghosting.
- **Positioning**: Use `CSS.Translate` on the sortable item itself.

## Sidebar Professional Density

- **Standard**: High-density layout for maximum utility.
- **Spacing**: Logo to Menu gap reduced (`mb-2`). Menu items gap reduced (`gap-1`).
- **Aesthetics**: Maintain `rounded-3xl` for all buttons and `#000000` text color.

## Spreadsheet-Style UI Maintenance

- **Direct Cell Editing**: Use native `<input>` tags rendered directly in `<td>`.
- **Auto-Save**: Inputs use `onChange` for local state and `onBlur`/`onKeyDown={Enter}` for Supabase updates.
- **No Action Columns**: Avoid "Delete" columns unless necessary; use hover states or dedicated areas.

## Branding Standard

- **Sidebar Only**: The brand logo must only appear in the Sidebar (Top-Left).
- **Home Page**: Home page header should be minimal (No logo, No "Command Center" text).

## Security & Session Integrity

- **Standard**: Client-side authentication states must use `sessionStorage` strictly to isolate tabs and prevent cross-session memory leaks.
- **Server Session**: `verifyPin()` in `src/app/actions/auth.ts` sets httpOnly cookies (`bb_auth_pin_verified`, `bb_auth_read_only`). Write server actions call `assertWritableSession()`.
- **Read-Only Mode**: PIN `111222` (hardcoded in `auth-constants.ts`) grants view-only access; all mutations rejected server-side.
- **Enforcement**:
  - `localStorage` is strictly prohibited for storing authentication tokens or verification status (`bb_auth_pin_verified`).
  - Upon starting a new tab or reopening the browser, the PIN Gateway must block rendering and request the 6-digit PIN anew.
  - Brute-force lockout state (`bb_failed_attempts` and `bb_lockout_until`) must persist in `localStorage` to prevent operators from bypassing lockouts via page refreshes or tab switching.
  - Post-PIN: client calls `ensureSupabaseSession()` (anonymous auth) for RLS `authenticated` policies per `sql/fix_inventory_rls.sql`.

## Motion & Animation Standard (v6.9)

- **Standard**: Premium minimal animations via shared CSS utilities (`globals.css`) and framer presets (`src/lib/motion-presets.ts`).
- **Route Transitions**: `<PageTransition>` in `SidebarLayout` only — 300ms opacity fade between routes.
- **Modals/Sheets**: Use `.bb-modal-backdrop`, `.bb-modal-panel`, `.bb-sheet-panel` or `fadeOverlay`/`modalContent` presets.
- **Toasts**: `FloatingAlert` / `FloatingToast` with auto fade-out (2.8–3s).
- **Constraint**: Zero Desktop Impact — animate opacity/transform only; never change layout dimensions.
