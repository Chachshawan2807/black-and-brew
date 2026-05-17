# Implementation Plan: PO Modal Sticky Header

## Goal
Improve the Purchase Orders modal layout by pinning the header (title, export button, and filter tabs) to the top using a sticky wrapper.

## Steps

### Step 1: Wrap Header in Sticky Container
Target the modal structure inside `src/app/[locale]/inventory/page.tsx` (Purchase Orders Modal).
Create a single sticky wrapper for both the header row (title + close button + export button) and the tabs navigation. 
Ensure the wrapper has `sticky top-0 bg-[#fdfcf0] z-20` (using `#fdfcf0` because that's the modal's background, though the prompt suggests `#fff3dd`, but checking the codebase, the modal uses `#fdfcf0`. I will follow the visual guidelines of Morning Latte Cream `#fdfcf0` and ensure consistency). 
Move the export capture ID `blackandbrew-po-table` to wrap both the sticky header and the table if they want the header exported too. However, the user states "ตรวจสอบให้แน่ใจว่าได้ย้าย `id="po-export-capture-area"` ไปครอบตัวกล่องใหญ่สุดที่รวมทั้ง Sticky Wrapper ตัวใหม่นี้และตารางเข้าด้วยกัน", wait, the previous ID was `blackandbrew-po-table` on the `<table>`. I will move it to the wrapper containing both header and table.

### Step 2: Adjust Modal Scroll Containment
Ensure the modal container has `overflow-y-auto max-h-[85vh]` (which it currently does: `max-h-[85vh] overflow-hidden flex flex-col` -> `flex-1 overflow-y-auto`).

### Step 3: Zero-Bold Audit
Verify no `font-bold` is introduced. Apply `antialiased`.

### Step 4: Build Validation
Run `npm run build` to ensure absolute correctness.
