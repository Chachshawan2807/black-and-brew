# Implementation Plan: AI Agent Logo Update

- **Goal**: Replace the Lucide-react `Bot` icon in the AI Assistant "บรู" chat overlay with the new branding logo at `/ai-agent-logo.svg`.
- **Architecture**: 
  - Update `src/components/ai/AIChatOverlay.tsx` to import `Image` from `next/image`.
  - Replace occurrences of the `<Bot />` icon with the `<Image />` component referencing `/ai-agent-logo.svg`.
  - Maintain the rounded avatar borders (`rounded-2xl`) and sizing (`w-8 h-8` container with `w-6 h-6` logo in the header; `w-7 h-7` container with `w-5 h-5` logo in bubble/loader).
- **Tech Stack**: Next.js 16.2, React 19, Tailwind CSS.

---

## Detailed Tasks

### Task 1: Refactor `AIChatOverlay.tsx`
- **Files**: Modify `src/components/ai/AIChatOverlay.tsx`
- **Changes**:
  1. Import `Image` from `next/image`.
  2. Remove `Bot` from `lucide-react` import.
  3. Replace `<Bot size={16} ... />` in header with `<Image src="/ai-agent-logo.svg" alt="บรู โลโก้" width={24} height={24} className="w-6 h-6 object-contain" />`.
  4. Replace `<Bot size={13} ... />` in loading indicator with `<Image src="/ai-agent-logo.svg" alt="บรู โลโก้" width={20} height={20} className="w-5 h-5 object-contain" />`.
  5. Replace `<Bot size={13} ... />` in `ChatBubble` sub-component with `<Image src="/ai-agent-logo.svg" alt="บรู โลโก้" width={20} height={20} className="w-5 h-5 object-contain" />`.

### Task 2: Verify Design & Zero-Bold Policy Compliance
- **Scan**: Run a visual review / dry run check ensuring no layout shifting or container sizing mismatch exists.
- **Zero-Bold**: Ensure no `font-bold` or `font-semibold` tags or attributes exist in the modified sections.

### Task 3: Run Full Test Suite
- **Command**: `npx vitest run`
- **Criteria**: All tests (including our cookie date persistence and zero-value logic) pass successfully with zero failures.

### Task 4: Compile & Production Build Validation
- **Command**: `npm run build`
- **Criteria**: Production build compiles with exit code 0, confirming type inference safety and static page rendering safety.
