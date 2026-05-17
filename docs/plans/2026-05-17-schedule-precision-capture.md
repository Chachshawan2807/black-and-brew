# Implementation Plan: Precision Schedule Image Capture

- **Goal**: Resolve the extra white space at the bottom of the exported schedule image and guarantee perfect column alignment across smaller screens by wrapping all schedule components inside the inner scrolling container.
- **Structural Re-alignment**:
  - Remove `id="blackandbrew-schedule-table"` from the outer full-height flex container.
  - Relocate the **Holiday row** and **Day headers** inside the `overflow-x-auto` scroll container so they scroll and export as a single unified `min-w-[900px]` block.
  - Apply `id="blackandbrew-schedule-table"` directly on the inner `min-w-[900px] h-fit bg-[#fdfcf0]` grid block so it tight-crops the calendar precisely to its contents.
- **Logic Refactoring**:
  - Update `exportScheduleImage` in `ScheduleClient.tsx` to include option styles:
    ```typescript
    style: {
      margin: '0',
      padding: '0',
      border: 'none',
      boxShadow: 'none',
    }
    ```
- **Zero-Bold Policy**: Enforced.

---

## Detailed Tasks

### Task 1: Refactor `ScheduleClient.tsx` Grid Structure
- Move holiday row and day headers inside `<div className="flex-1 overflow-y-auto overflow-x-auto">`.
- Apply `id="blackandbrew-schedule-table" className="min-w-[900px] bg-[#fdfcf0] h-fit flex flex-col"` to the inner wrapper container.

### Task 2: Refactor `exportScheduleImage` Options
- Add the required styles: `margin: '0'`, `padding: '0'`, `border: 'none'`, and `boxShadow: 'none'` inside `toPng` config.

### Task 3: Unit and Compiler Sanity Checks
- Run Vitest tests (`npx vitest run`).
- Run production build compile (`npm run build`).
