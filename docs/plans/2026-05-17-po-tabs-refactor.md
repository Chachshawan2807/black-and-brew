# Implementation Plan: Purchase Orders Modal Tab Navigation Refactoring

- **Goal**: Upgrade the purchase orders navigation category tabs to a highly modern, minimal, and premium "Pill-shaped Navigation Chips" design while strictly conforming to the R0 Zero-Bold Policy.
- **Location**: `src/app/[locale]/inventory/page.tsx` (lines 1339-1358)
- **Tech Stack**: Next.js 16, React, Tailwind CSS.

---

## Detailed Tasks

### Task 1: Refactor PO Tabs in `src/app/[locale]/inventory/page.tsx`
- Replace category tabs with Pill-shaped Navigation Chips:
  - Wrapper styling: `flex flex-wrap gap-2.5 items-center pb-4` to improve breathing room and adaptability.
  - Active chip styling: `bg-neutral-900 border-neutral-900 text-white` with `font-normal` (Zero-Bold Policy compliant).
  - Inactive chip styling: `border-neutral-200 bg-transparent text-neutral-800 hover:bg-neutral-50` with `font-normal`.
  - Chip numbers formatting: Separate the count numbers (e.g. `(101)`) using `<span>` elements with a lighter size (`text-[13px] ml-1 font-mono font-normal`) and colors (`text-white/60` for active state, `text-neutral-500` for inactive state).

### Task 2: Validate Zero-Bold Policy
- Confirm that every single item and sub-header in the Purchase Orders modal respects the `font-normal` / `font-medium` constraint, completely eliminating `font-bold` or `font-semibold`.

### Task 3: Unit and Build Verification
- Execute `npx vitest run` to ensure unit test sanity.
- Compile and run `npm run build` to verify 100% stable static pages generation.
