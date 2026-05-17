# Implementation Plan: Control Panel Buttons Restructure

## Goal

Restructure the main control panel buttons in the inventory module into a unified 2-row, 3-column grid system, and adjust spacing to ensure a clean, minimalist layout adhering to the Zero-Bold policy.

## Steps

### Step 1: Locate the Actions Component

Search for the buttons ("รับเข้าสินค้า", "นำออกสินค้า", "บันทึก", "รายการสั่งซื้อ", "เพิ่มสินค้า", "ประวัติ") which are likely in `src/app/[locale]/inventory/page.tsx` or a related component.

### Step 2: Implement Unified Grid System

Group the 6 buttons into a single container:

```tsx
<div className="grid grid-cols-3 gap-3 mb-6 w-full box-border">
  {/* Row 1 */}
  <button>รับเข้าสินค้า</button>
  <button>นำออกสินค้า</button>
  <button>บันทึก</button>
  {/* Row 2 */}
  <button>รายการสั่งซื้อ</button>
  <button>เพิ่มสินค้า</button>
  <button>ประวัติ</button>
</div>
```

### Step 3: Space Audit for Frequently Used Items

Find the "รายการที่ใช้บ่อย" (Frequently Used Items) section just below the buttons. Add `mt-4` or `pt-2` to create breathing room.

### Step 4: Zero-Bold Audit

Ensure all buttons and the section header use `font-normal` and `antialiased`. Remove any `font-semibold` or `font-bold`.

### Step 5: Build Validation

Run `npm run build` to verify layout and syntax correctness.

