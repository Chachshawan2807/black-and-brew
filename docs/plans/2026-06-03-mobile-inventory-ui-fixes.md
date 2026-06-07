# Plan: Mobile Inventory UI & Drag-and-Drop Fixes

> **Status:** Completed (v6.3) — Superseded by v6.8 stock sync + v6.9 motion system. See `docs/changelog.md`.

Goal: Fix visual and functional issues on the mobile layout of the Inventory page:

1. "บันทึก" (Save) button overflows outside the Quick Entry card container.
2. "สั่งซื้อ" (Order) button does not display the badge number (truncated as three dots).
3. The inventory items card list on mobile does not support drag-and-drop reordering.

## Tech Stack & Architecture

- Next.js (App Router, Client Component)
- TailwindCSS
- `@dnd-kit/core` & `@dnd-kit/sortable`
- Vitest & React Testing Library (JSDom)

## Proposed Changes

### [Component Name] Inventory Page

We will modify [page.tsx](file:///c:/Users/chach/.gemini/antigravity/scratch/black-and-brew/src/app/[locale]/inventory/page.tsx) to resolve these issues.

#### [MODIFY] [page.tsx](file:///c:/Users/chach/.gemini/antigravity/scratch/black-and-brew/src/app/[locale]/inventory/page.tsx)

1. **Fix Save Button Overflow:**
   - Change the layout of the Quick Entry row containing Quantity, Transaction Type, and Save buttons.
   - On mobile, wrap Quantity input and Segmented Control in a horizontal flex container to keep them side-by-side (fits ~280px).
   - Make the "บันทึก" button wrap below them as a full-width button.
   - Keep the inline flex layout on desktop/tablet (`sm:` and up).

2. **Fix Badge Truncation:**
   - Modify the Shopping Cart button structure.
   - Move the count badge `<span>{itemsToOrder.length}</span>` outside the text `<span>สั่งซื้อ</span>`.
   - Set the badge `<span>` to `shrink-0` and the text `<span>` to `truncate`.
   - On mobile screens, if space shrinks, the text will truncate while the badge stays completely visible.

3. **Fix Drag-and-Drop on Mobile:**
   - Import `MouseSensor` and `TouchSensor` from `@dnd-kit/core`.
   - Reconfigure `sensors` to use `MouseSensor` (with distance constraint) and `TouchSensor` (with `delay: 250` and `tolerance: 5` constraints) to support touch dragging without breaking normal page scroll.
   - Wrap the entire list content (both desktop and mobile lists) inside a single `<DndContext>`.
   - Inside the mobile list container (`md:hidden`), wrap items in `<SortableContext>`.
   - Define a `MobileSortableRow` component utilizing `useSortable` and a `GripVertical` handle to make mobile cards draggable.

## Verification Plan

### Automated Tests

- Create a new unit/integration test file [mobile_layout.test.tsx](file:///c:/Users/chach/.gemini/antigravity/scratch/black-and-brew/src/test/mobile_layout.test.tsx) to verify:
  1. The layout elements render correctly.
  2. The Shopping Cart badge is rendered outside the text span element and does not inherit the text truncate.
  3. The `MouseSensor` and `TouchSensor` are configured.
- Run tests: `npx vitest run src/test/mobile_layout.test.tsx`.

### Manual Verification

- Verify compilation and build integrity: `npm run build`.
- Review the responsive UI layout structure.
