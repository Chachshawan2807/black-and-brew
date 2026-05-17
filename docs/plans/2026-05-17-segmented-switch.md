# Implementation Plan: Unified Stock Action Bar with Segmented Switch

## Goal

Restructure the inventory quick actions form. Merge the "Search Item" input, "Quantity" input, and the "IN/OUT" actions into a single horizontal row. The IN/OUT buttons will be transformed into a modern Segmented Control (Toggle Switch), and the text sizes will be scaled up to `text-[14px]` for improved readability while strictly adhering to the Zero-Bold typography policy.

## Steps

### Step 1: Refactor the Input Row

Target `src/app/[locale]/inventory/page.tsx`. Transform the form's first row into a `flex flex-row items-center gap-2 w-full`.

- **Search Input:** Wrap in `flex-[2] relative` and scale to `text-[14px]`.
- **Quantity Input:** Set `w-20 md:w-24`, add placeholder `"จำนวน"`, and scale to `text-[14px]`.
- **Segmented Control:** Create a pill-shaped toggle for IN/OUT tied to the `quickType` state. Ensure `font-normal` and `antialiased` are used globally.

### Step 2: Update the Action Grid

Remove the old IN/OUT buttons from the `grid-cols-6` block. Convert the grid to `grid-cols-4` for the remaining actions: `บันทึก` (Save), `รายการสั่งซื้อ` (Purchase Orders), `เพิ่มสินค้า` (Add Item), and `ประวัติ` (History).

### Step 3: Zero-Bold Policy Validation

Ensure no `font-bold` or `font-medium` snuck into the switch text. The entire bar should use `font-normal text-[14px] antialiased`.

### Step 4: Verification

Run `npm run build` to verify standard build integrity.

