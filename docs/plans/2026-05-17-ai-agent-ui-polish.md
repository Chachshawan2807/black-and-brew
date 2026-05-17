# Implementation Plan: AI Agent UI Polish & Interaction

- **Goal**: Polish the AI Assistant "บรู" chat overlay by:
  1. Swapping the generic floating button closed state icon (`MessageCircle`) with the white-inverted brand logo `/ai-agent-logo.svg`.
  2. Increasing the message bubble text size by one scale step (`text-[13px]` -> `text-[15px]` or `text-sm`/`text-base`) to improve readability on tablets and mobile screens while strictly respecting the **Zero-Bold Policy**.
  3. Implementing a "Click Outside to Close" (Backdrop Click) transparent overlay so the chat modal closes dynamically when the user clicks empty space.
- **Architecture**:
  - Update `src/components/ai/AIChatOverlay.tsx` to handle the trigger icon swap, the bubble text size, and add a backdrop `motion.div` overlay.
- **Tech Stack**: Next.js 16.2, React 19, Tailwind CSS, Framer Motion.

---

## Detailed Tasks

### Task 1: Refactor `AIChatOverlay.tsx` for Button Swap & Font Sizing & Backdrop Close
- **Files**: Modify `src/components/ai/AIChatOverlay.tsx`
- **Changes**:
  1. Change trigger `<MessageCircle size={22} />` to `<Image src="/ai-agent-logo.svg" alt="บรู โลโก้" width={26} height={26} className="w-6.5 h-6.5 object-contain invert" />` (to render white on the black background).
  2. Increase text size in the `ChatBubble` component from `text-[13px]` to `text-[15px]` to improve legibility.
  3. Insert a fixed click backdrop `motion.div` with class `fixed inset-0 z-[198] bg-black/0` directly before the chat window `motion.div` inside the `<AnimatePresence>` block.

### Task 2: Validate Zero-Bold Policy Compliance
- **Scan**: Verify that the text modifications retain `font-normal` class and do not introduce any `font-bold` or `font-semibold` elements.

### Task 3: Run Vitest Unit Tests
- **Command**: `npx vitest run`
- **Criteria**: Verify all 8 test cases pass successfully.

### Task 4: Production Build Compilation Check
- **Command**: `npm run build`
- **Criteria**: Compile successfully with exit code 0 to ensure zero TypeScript, build, or Next.js static rendering errors.
