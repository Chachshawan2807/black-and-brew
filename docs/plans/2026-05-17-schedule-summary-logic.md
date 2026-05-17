# Implementation Plan: Strict Shift Count Validation in Summary Row

- **Goal**: Re-engineer the calculation logic of the summary row in the Schedule Grid (`ScheduleClient.tsx`) to strictly count only employees having shifts designated as `'6:30'`, `'7:00'`, or `'8:00'`.
- **Constraint**: Other values (like `'ร้านซักผ้า'`, `'ไปสาขา 2'`, `'ลา'`, empty, or null) must be excluded from the summary counts. Visual labels inside cells must remain untouched.
- **Architecture**: Edit `src/app/[locale]/schedule/ScheduleClient.tsx` bottom-most summary calculations row.
- **Tech Stack**: Next.js 16.2, React 19, Tailwind CSS.

---

## Detailed Tasks

### Task 1: Refactor `ScheduleClient.tsx`
- **Location**: `src/app/[locale]/schedule/ScheduleClient.tsx` (around lines 949-960)
- **Refactoring**:
  - Implement a `VALID_WORK_SHIFTS` constant array: `['6:30', '7:00', '8:00']`.
  - Update `fohCount` calculation logic:
    ```typescript
    const VALID_WORK_SHIFTS = ['6:30', '7:00', '8:00'];
    const fohCount = shifts.filter(s => {
      const loc = s.metadata?.location?.trim();
      return s.start_time.startsWith(date) && s.status !== 'on_leave' && VALID_WORK_SHIFTS.includes(loc || '');
    }).length;
    ```

### Task 2: Validate Visual & Zero-Bold Constraints
- **Cell Content**: Confirm that the cells rendering `ร้านซักผ้า`, `ไปสาขา 2`, or other specific labels remain active and unaffected.
- **Zero-Bold**: Confirm no bold style modifications are introduced in the summary rows.

### Task 3: Run Vitest Unit Tests
- **Command**: `npx vitest run`
- **Goal**: Ensure all 8 test cases pass flawlessly.

### Task 4: Verify Next.js Production Build
- **Command**: `npm run build`
- **Goal**: Compile successfully with exit code 0 to verify TypeScript and static optimization stability.
