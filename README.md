# BLACK-AND-BREW ERP System

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev

# or
yarn dev

# or
pnpm dev

# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Changelog

### Version 2.2: Global Omni-Refactor (May 2026)

- **UI Architecture:** Flattened all overlapping DOM structures (removed `absolute inset-0 z-10 opacity-0` patterns). Native inputs are now effectively hidden using `sr-only` to preserve accessibility while maximizing styling control.
- **Data Integrity:** Implemented "Safe Deletion" globally (e.g., shifts are safely deleted prior to employee profile deletion to prevent FK violations). Optmistic UI updates now trigger instantly using `.filter()` methods.
- **Aesthetics (R0 Constraints):** Strict typography and color policies enforced. Eradicated all `font-bold` and `font-semibold` usage (app-wide adherence to `font-normal`). Unified primary text colors to `#000000` and secondary/date accents to Deep Gray `#4b5563`.
- **System Cleanup:** Purged deprecated testing scripts, cleaned up `.gitignore`, and streamlined Next.js server actions.

### Version 2.6: High-End Inventory Grid (May 2026)

- **Undo/Redo Stability:** Refactored history engine to include snapshot-based persistence and strict asynchronous synchronization. Resolved the "two-click" desync bug and implemented state-locking during database sync.
- **Numeric Formatting:** Integrated a "Smart Sanitizer" to handle leading zeros (05 bug) and empty-string Supabase errors.
- **Aesthetics:** Applied a "Super-Soft Pastel" theme with `rounded-3xl` corner radius, lavender page backgrounds, and emerald hover states.
- **Advanced Management:** Implemented a full-form "Add Item" modal and custom confirmation dialogs to eliminate native browser alerts.

### Version 3.0: The Great Purge — Zero-Waste Architecture (May 2026)

- **Dead Code Elimination:** Removed 14+ orphaned files including legacy Python memory engine (`mem0.py`), unused AI libraries (`gemini.ts`, `token-utils.ts`, `memory.ts`), orphaned API routes, and debug scripts.
- **Dependency Cleanup:** Uninstalled 3 unused npm packages (`js-tiktoken`, `tokentracker-cli`, `@google/genai`), reducing `node_modules` by 39 packages.
- **Directory Hygiene:** Purged `__pycache__/`, `grep_ast/`, broken `[locale` bracket directory, and empty `staff/` route. Removed dead `src/app/api/` tree.
- **Type Safety:** Fixed TypeScript type narrowing in inventory `onBlur` handler and duplicate interface property in `ScheduleClient.tsx`.
- **Table Architecture:** Migrated inventory grid from flex-based layout to standard HTML `<table>`/`<tr>`/`<td>`. Fixed React hydration error by moving `<DndContext>` outside `<tbody>`.
- **Build Integrity:** Verified clean `next build` — zero errors across all 5 route modules.

### Version 3.1: Staff Access Refinement & Entry Point Logic (May 2026)

- **Staff Dashboard Cleanup:** Removed restricted "Inventory Management" shortcuts from the Staff Dashboard to enhance focus on core duties (Clocking & Scheduling).
- **Entry Point Logic:** Established a mandatory root redirect from `/` to `/th` (Command Center) via `src/app/page.tsx` for a standardized user landing experience.
- **Visual Symmetry:** Maintained R0 design standards with `rounded-3xl` and `font-normal` while streamlining layout components.
