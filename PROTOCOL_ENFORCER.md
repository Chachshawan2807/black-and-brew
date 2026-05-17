# PROTOCOL ENFORCER

## System Rebirth - Transaction Integrity
- **Standard**: Transaction history system uses a **two-step fetch** strategy (raw transactions + separate item name lookup) to bypass FK join and RLS complications.
- **Cache Policy**: Always use `unstable_noStore()` to bypass Next.js caching for transaction data.
- **Column Standard**: Explicit joins on `inventory_item_id` are mandated. UI Undo is bypassed for financial/stock records to maintain ledger accuracy.
- **Error Transparency**: All Supabase errors must be logged with `message`, `details`, and `hint` for immediate debugging.

## Transactional Integrity
- **Standard**: Always use Postgres RPC (`record_inventory_transaction`) for stock-history synchronization to prevent data mismatch.
- **Implementation**: Any stock change (Add/Subtract) must be performed within a single database transaction that simultaneously updates the inventory item and creates the corresponding ledger entry.
- **Atomicity**: If either the update or the insertion fails, the entire operation must rollback to maintain audit trail accuracy.

## Ledger Integrity
- **Standard**: Financial/Stock transactions MUST NEVER use the UI Undo/Redo stack.
- **Implementation**: Mistakes must be corrected via compensating transactions or explicit deletion in the History ledger. This prevents database deadlocks and maintains absolute audit trail accuracy.

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
