# docs/plans/2026-05-21-restore-nextjs-middleware.md

## Problem Statement

The `/th/inventory` route returns a `404 Not Found` error. Other routes work.

## Deep Scan Findings

1. **Routing Folder Structure:**
   - Folder exists: `src/app/[locale]/inventory`
   - Entry file: `page.tsx`
   - Component: `DynamicInventoryManager()` (exported as default)
   - Status: Correct. No spelling mistakes or missing pages.

2. **Sidebar & Link Audit:**
   - Link config in `src/lib/menu-list.ts`: `href: \`${prefix}/inventory\`` -> resolves to `/th/inventory`
   - Link config in `src/app/[locale]/page.tsx`: `href: \`/${locale}/inventory\`` -> resolves to `/th/inventory`
   - Status: Correct. Links point to `/th/inventory` with correct spelling and locale prefixes.

3. **Type-Safety Check:**
   - Executing `npx tsc --noEmit` returns **0 errors** across the codebase.
   - Status: Correct and clean.

4. **Root Cause Identification:**
   - In Next.js, middleware must be named `middleware.ts` (or `.js`) in root or `src/`.
   - The middleware file is currently named `src/proxy.ts` (migrated in commit `99c87ae` to align with "Server-side Proxy" terminology).
   - Because Next.js does not recognize `proxy.ts` as a middleware file, Next.js ignores it.
   - Internationalized routes managed by `next-intl` (using dynamic route segment `[locale]`) rely on middleware to rewrite pathnames and map headers properly.
   - Without active middleware, the Next.js routing system fails to route and rewrite `/th/inventory` correctly, yielding a 404 error.

## Action Plan

1. Restore Next.js routing by copying/moving `src/proxy.ts` to `src/middleware.ts`.
2. Delete `src/proxy.ts` to keep the codebase clean.
3. Validate by running TypeScript and testing the application routes.
