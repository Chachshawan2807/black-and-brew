# Implementation Plan: PO Multi-Select & Image Export

## Goal

Implement a multi-select filter for the Purchase Orders module and integrate high-fidelity image export using `html-to-image`, strictly adhering to the Zero-Bold Policy and high-fidelity aesthetics.

## Steps

### Step 1: Locate the Target Component

Find the component handling the Purchase Orders (likely `PurchaseOrdersModal.tsx` or similar in `src/app/[locale]/inventory/` or related).

### Step 2: Refactor State Management

Change `activeTab` string state to `selectedChannels` array state `string[]`.

Update the chip/tab toggle logic:

- If 'all' is clicked, set state to `['all']`.
- If another channel is clicked, toggle it in the array, removing 'all'.
- If the array becomes empty, fallback to `['all']`.

### Step 3: Adapt the Rendering Filter

Update the filter logic for `purchaseOrders` to check if `selectedChannels` includes 'all' or the `order.channel`.

### Step 4: Integrate High-Fidelity Image Export

Import `toPng` from `html-to-image`.

Add `id="blackandbrew-po-table"` to the main table element.

Create an `exportPOImage` function using the exact logic provided (pixelRatio: 2, backgroundColor: '#fff3dd').

Add a "บันทึกเป็นรูปภาพ" minimalist pastel capsule button near the top. Ensure `font-normal` and `antialiased` are applied.

### Step 5: Build Validation

Run `npm run build` to verify type safety and build integrity.
