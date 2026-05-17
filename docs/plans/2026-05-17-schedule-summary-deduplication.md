# Implementation Plan: Precise Summary Row Computations with Deduplication & Inactive Employee Filtering

- **Goal**: Re-architect the daily summary column calculation in `ScheduleClient.tsx` to prevent bloated totals (e.g. duplicate counts per employee or counting inactive/deleted employees from legacy shifts).
- **Inspection Finding**: 
  - The cell renderer uses `shift?.metadata?.location` to display the shift label.
  - Legacy shifts for inactive/deleted employees still exist in the database and are loaded in `shifts`.
  - The summary row calculation should strictly filter by rendered employees `orderedProfileIds` and deduplicate counts using a `Set`.
- **Properties**: Actual property is `s.metadata?.location`.

---

## Detailed Tasks

### Task 1: Refactor `ScheduleClient.tsx`
- **Location**: `src/app/[locale]/schedule/ScheduleClient.tsx` (around lines 949-960)
- **Refactoring**:
  - Update `fohCount` calculation to use `VALID_SHIFTS = ['6:30', '7:00', '8:00']`.
  - Ensure deduplication: Wrap employee IDs in a `Set` to prevent double-counting.
  - Active profiles constraint: Ensure `s.employee_id` exists within `orderedProfileIds`.
  - Exact property usage: `s.metadata?.location`.
  ```typescript
  const VALID_SHIFTS = ['6:30', '7:00', '8:00'];
  const fohCount = new Set(
    shifts
      .filter(s => {
        const loc = s.metadata?.location?.trim();
        const isSameDay = s.start_time.startsWith(date);
        const isActiveEmployee = s.employee_id && orderedProfileIds.includes(s.employee_id);
        return isSameDay && s.status !== 'on_leave' && isActiveEmployee && VALID_SHIFTS.includes(loc || '');
      })
      .map(s => s.employee_id)
  ).size;
  ```

### Task 2: Visual Parity Maintenance
- Preserve all cell colors, text structures, and custom labels (`ร้านซักผ้า`, `ไปสาขา 2`, `ลา`).

### Task 3: Unit Verification
- Execute `npx vitest run` to ensure unit test sanity.

### Task 4: Production Compilation Verification
- Run `npm run build` to verify Turbo and TypeScript type safety.
