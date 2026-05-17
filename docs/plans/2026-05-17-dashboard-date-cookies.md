# Implementation Plan: Persistent Date Range via Cookies

- **Goal**: Lock the user-selected date range (Start Date / End Date) for the BLACKANDBREW dashboard (LiveShiftList) using browser cookies. The date range should persist across page refreshes (F5) and page-to-page navigation, reverting to default (current week) only if never set or if changed explicitly by the user.
- **Architecture**: 
  - **Client-Side Persistence**: In `LiveShiftList.tsx`, `handleDateChange` will store the selected dates in browser cookies (`dashboard_start_date` and `dashboard_end_date`) with a 1-year expiration (Max-Age 31,536,000 seconds) and `SameSite=Lax` before updating the URL search parameters.
  - **Server-Side Fallback Resolution**: In `src/app/[locale]/dashboard/page.tsx`, Next.js `cookies()` header function will read any existing cookie dates. If no URL parameters are present, it will fallback to these cookie values before resorting to the current week's Monday-to-Sunday default.
- **Tech Stack**: Next.js 16.2, React 19, TypeScript, Vitest, `jsdom`, `date-fns`.

---

## Detailed Tasks

### Task 1: Create a Failing Test for Date Persistence Logic
- **Files**: Create `src/test/dashboard_date_cookies.test.ts`
- **Logic**: Mock `document.cookie` / Next.js headers `cookies()` behaviour to test:
  1. Setting dates in client sets cookies correctly.
  2. Resolving server-side parameters with fallback preference: URL > Cookies > Current Week (Monday/Sunday).
- **Execution Command**: `npx vitest run src/test/dashboard_date_cookies.test.ts`

### Task 2: Refactor Client Component `LiveShiftList.tsx`
- **Files**: Modify `src/app/[locale]/dashboard/components/LiveShiftList.tsx`
- **Refactor**: Update `handleDateChange` to store `start` and `end` in cookies:
  ```typescript
  const handleDateChange = (start: string, end: string) => {
    document.cookie = `dashboard_start_date=${start}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `dashboard_end_date=${end}; path=/; max-age=31536000; SameSite=Lax`;
    router.push(`?start=${start}&end=${end}`);
  };
  ```

### Task 3: Refactor Server Page Component `page.tsx`
- **Files**: Modify `src/app/[locale]/dashboard/page.tsx`
- **Refactor**: Import `cookies` from `next/headers` and integrate the fallback chain:
  ```typescript
  import { cookies } from 'next/headers';
  ...
  const { start: startParam, end: endParam } = await searchParams;
  const cookieStore = await cookies();
  
  const savedStart = cookieStore.get('dashboard_start_date')?.value;
  const savedEnd = cookieStore.get('dashboard_end_date')?.value;

  const startDate = startParam || savedStart || format(monday, 'yyyy-MM-dd');
  const endDate = endParam || savedEnd || format(sunday, 'yyyy-MM-dd');
  ```

### Task 4: Run Tests to Verify "GREEN" State
- **Execution Command**: `npx vitest run`
- **Criteria**: All tests (including basic, zero_persistence, and the new date cookies test) pass successfully.

### Task 5: Integrity and Build Validation
- **Execution Command**: `npm run build`
- **Criteria**: Complete the full Next.js production build to verify type inference, async page parameters, and Zero-Bold compliance.
