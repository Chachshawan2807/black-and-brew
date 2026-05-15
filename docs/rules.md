# Rules — BLACKANDBREW ERP

> **Version:** 3.1 | **Last Updated:** 2026-05-15 | **Enforcement:** Mandatory

---

## 1. Naming Conventions

### Database Tables

| Rule | Example | Anti-pattern |
| :--- | :--- | :--- |
| Plural table names | `inventory_items`, `inventory_transactions` | ~~`inventory_item`~~, ~~`inventory_transaction`~~ |
| Snake_case columns | `inventory_item_id`, `order_qty`, `target_stock` | ~~`inventoryItemId`~~, ~~`orderQty`~~ |
| UUID primary keys | `id UUID DEFAULT gen_random_uuid()` | ~~`id SERIAL`~~ |

### Critical Column Names (VERIFIED — DO NOT CHANGE)

| Table | Column | Notes |
| :--- | :--- | :--- |
| `inventory_transactions` | `inventory_item_id` | FK to `inventory_items.id` — renamed from `product_id` |
| `inventory_items` | `stock`, `order_qty`, `order_point`, `target_stock` | NUMERIC type, sanitize empty → 0 |
| `inventory_items` | `sort_order` | INTEGER, controls drag-and-drop ordering |
| `inventory_config` | `settings` | JSONB containing `order`, `labels`, `widths` |

### TypeScript/React

| Rule | Example | Anti-pattern |
| :--- | :--- | :--- |
| PascalCase components | `EditableCell`, `SortableRow` | ~~`editableCell`~~ |
| camelCase functions | `handleSaveField`, `fetchTransactionHistory` | ~~`HandleSaveField`~~ |
| Interface prefix: none | `InventoryItem`, `ColumnDef` | ~~`IInventoryItem`~~ |
| Server Actions: `'use server'` | Top of file declaration | ~~Inline directive~~ |

### Files & Routes

| Rule | Example |
| :--- | :--- |
| Locale-prefixed routes | `/[locale]/inventory/` |
| Actions in `/actions/` | `src/app/actions/inventory-actions.ts` |
| Shared components in `/components/` | `src/components/ui/button.tsx` |
| Utility functions in `/lib/` | `src/lib/supabase.ts` |

---

## 2. Code Style Rules

### Typography (STRICT)

- ❌ **FORBIDDEN:** `font-bold`, `font-semibold`, `font-black`, `font-extrabold`
- ✅ **REQUIRED:** `font-normal` (weight 400) for all text
- ✅ **ALLOWED:** `font-medium` (weight 500) only for emphasized data labels

### CSS Classes (Aesthetic Enforcer)

- ✅ `rounded-3xl` for all buttons, cards, modals, inputs
- ✅ `#000000` for primary text color
- ✅ `border-[#000000]/5` for all separators
- ✅ `bg-[#fdfcf0]` for primary background
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

### Transaction Integrity

- Stock changes MUST go through `record_inventory_transaction` RPC
- Transactions MUST NEVER use UI Undo/Redo stack
- Corrections via compensating transaction or explicit deletion in History
- Transaction cancellation reverses stock manually + deletes record

### Date & Timezone

- All DB timestamps: `TIMESTAMPTZ` (stored as UTC)
- All display: Converted to GMT+7 (Bangkok) via `toLocaleString('th-TH')`
- Never use raw UTC dates in UI

### Environment Variables

- ❌ Never prefix secret keys with `NEXT_PUBLIC_`
- ❌ Never commit `.env.local` to Git
- ✅ Copy `.env.example` → `.env.local` for local setup
- ✅ Set Vercel env vars from `.env.example` for deployment

---

## 4. Build & Deploy Rules

- `npm run build` must exit with code 0 before any deployment
- All TypeScript errors must be resolved (strict mode)
- Secret check must pass before `git push`
- `.gitignore` must include: `.env.local`, `.next/`, `node_modules/`
