# Implementation Plan: Local Scheduler Data-Schema Compliance

## Goal

Resolve the shift rendering/disappearing bug in `BLACKANDBREW ERP` scheduler. When shifts are saved or updated, they optimistically render in the UI, but after 1 second (upon server-side revalidation/re-fetch hydration) they disappear due to timezone shifts or mismatching date fields. 

We will align Server Actions and client-side code by:
1. Normalizing all shift date strings to the standardized `YYYY-MM-DDT00:00:00` format in both Server Actions (fetching & saving) and client-side logic.
2. Integrating a robust date parser/helper that ensures consistent coordinate detection.
3. Maximizing horizontally available space, adhering strictly to the minimal Pastel Morning Latte aesthetics and Zero-Bold policy.

## Architecture & Tech Stack

- **Framework**: Next.js (App Router, Server Actions)
- **Database**: Supabase (PostgreSQL `shifts` table with `TIMESTAMPTZ` fields)
- **Component**: React Client Component with `isMounted` hydration guard
- **Testing**: Vitest (`jsdom` environment)

## Steps

### Step 1: Write a Failing TDD Test Case (RED Phase)

Create `src/test/date_compliance.test.ts` to test:
1. `isSameThaiDay` date comparison under different string formats (with timezone offset vs local date string).
2. Standardizing database-returned ISO strings to `YYYY-MM-DDT00:00:00` format.

Run `npm run test` to verify the tests fail or check existing suite passes.

### Step 2: Implement Shift Server Actions in `src/app/actions/shift-actions.ts`

Add two server actions:
1. `fetchShiftsAction(startDate: string, endDate: string)`:
   - Queries `shifts` using `supabaseAdmin`.
   - Cleanses the dates to `YYYY-MM-DDT00:00:00` format.
2. `saveShiftAction(payload)`:
   - Sanitizes and updates/inserts shifts into the database.
   - Ensures `start_time` and `end_time` are saved in normalized format.
   - Revalidates schedule and dashboard pages.

### Step 3: Update `src/app/[locale]/schedule/page.tsx`

Refactor server page to use the newly created `fetchShiftsAction` to ensure the server-side hydration props matches exactly what the client expects.

### Step 4: Update `src/app/[locale]/schedule/ScheduleClient.tsx`

1. Refactor `handleSave` to call `saveShiftAction` Server Action instead of the client-side `supabase.from('shifts')` call directly.
2. Normalize all dates in local state and history actions (`undo`/`redo`, `handleCopyShifts`, `handleSaveManagement`) to strictly match the `YYYY-MM-DDT00:00:00` format.
3. Standardize date matching in the `fohCount` filter at line 995 to use `isSameThaiDay(s.start_time, date)` rather than `s.start_time.startsWith(date)` to prevent timezone offset discrepancies.

### Step 5: Update `src/lib/date-utils.ts`

Revamp `isSameThaiDay` to safely normalize ISO date strings to their date-only portions before checking equality, ensuring zero timezone shifting side-effects.

### Step 6: Verify the Tests and the Local Build (GREEN Phase)

1. Run `npm run test` to make sure all tests pass cleanly.
2. Run `npm run build` to verify Next.js compilation compiles without warnings or errors.
