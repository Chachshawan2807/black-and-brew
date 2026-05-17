# Implementation Plan: Single-Row Micro Action Buttons

## Goal

Arrange the 6 primary inventory control panel buttons ("รับเข้าสินค้า", "นำออกสินค้า", "บันทึก", "รายการสั่งซื้อ", "เพิ่มสินค้า", "ประวัติ") into a single-row grid system (6 columns) with reduced proportions to maintain a clean, high-density, minimalist look adhering fully to the Zero-Bold policy.

## Steps

### Step 1: Modify the Layout of Action Buttons

Refactor the grid container in `src/app/[locale]/inventory/page.tsx` from `grid-cols-1 md:grid-cols-3` to `grid-cols-6 gap-1.5 mb-6 w-full box-border`.

### Step 2: Scale Down Button Proportions

For each `<button>` element:

- Reduce padding to: `py-2 px-1`
- Reduce text size to: `text-xs` (or `text-[13px]`)
- Reduce icon size to: `w-3.5 h-3.5`
- Keep `rounded-3xl` for consistent styling.

### Step 3: Zero-Bold Policy Validation

Ensure all text continues to use `font-normal` and `antialiased` to maintain the premium morning latte cream visual signature.

### Step 4: Verification

Execute `npm run build` to verify there are no compilation errors or UI breaks.

