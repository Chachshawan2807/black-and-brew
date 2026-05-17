# Implementation Plan: Typography Refinement & Contrast Tuning

- **Goal**: Refine the font weight and contrast hierarchy in the "บรู" AI Chat Overlay:
  1. Calibrate message bubbles to use `font-light` and `antialiased` styling for an extremely crisp, premium look.
  2. Enhance the contrast of secondary labels (sub-headers and loaders) by transitioning them from generic transparent black (`text-[#000000]/40`) to a deeper, more readable "Deep Coffee" shade (`text-[#1a1a1a]`).
  3. Ensure `/ai-agent-logo.svg` is cleanly integrated across all points of the component.
- **Architecture**: Edit `src/components/ai/AIChatOverlay.tsx` directly.
- **Tech Stack**: Next.js 16.2, React 19, Tailwind CSS.

---

## Detailed Tasks

### Task 1: Refactor `AIChatOverlay.tsx`
- **Files**: Modify `src/components/ai/AIChatOverlay.tsx`
- **Changes**:
  1. Header sub-label: change `text-[#000000]/40` to `text-[#1a1a1a]` (or `text-black/80`).
  2. Loader thinking label: change `text-[#000000]/40` to `text-[#1a1a1a]`.
  3. Chat Bubble text: change `text-[15px] font-normal` to `text-[15px] font-light antialiased`.
  4. Ensure all SVG references are cleanly typed.

### Task 2: Validate Zero-Bold Compliance
- **Scan**: Double check that no `font-bold` or `font-semibold` are introduced, keeping only `font-normal` and `font-light` weights.

### Task 3: Verify Unit Tests
- **Command**: `npx vitest run`
- **Criteria**: Verify that all 8 unit tests in our Vitest suite pass successfully.

### Task 4: Production Build Check
- **Command**: `npm run build`
- **Criteria**: Complete production compilation with exit code 0 to verify build integrity.
