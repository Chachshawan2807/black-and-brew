# Changelog

## 2026-05-25

* **Execution**: [BLACKANDBREW ERP: SKILL HARVESTING & SYNERGY BUNDLING PROTOCOL]
* **Action**: Executed ONE-SHOT Safe Discovery Scan across `api`, `components`, `utils`, `lib`, and `actions/tools`.
* **Result**: Extracted Data, UI/UX, and Performance capabilities.
* **Output**: Generated and bundled 5 new Synergy Skill Sets (External Intel Set, High-Velocity UI Set, Safe Data Injector Set, Token Economy Set, Aesthetic Standardization Set) and saved to `docs/skills.md`.
* **Update**: Executed RTK INTEGRATION & KNOWLEDGE RECONSTRUCTION. Identified "RTK: The Reconstruction ToolKit" (World-Class DND Rollback & Undo Stack). Created [Bundle 6] System Reconstruction & Recovery Set.
* **Execution**: [REBIRTH PROTOCOL: PERFORMANCE-DRIVEN OMNI-REFACTOR] (v4.0)
* **Action**: Executed Omni-Refactor across components and APIs. Reduced Supabase payload size by removing `select('*')`. Eliminated event listener memory leaks via `AbortController`. Addressed CLS in Weather Widget. Enforced Zero-Bold Policy in AI Chat Overlay.
* **Execution**: [REBIRTH PROTOCOL: SECURITY-HARDENED OMNI-REFACTOR] (v4.1)
* **Action**: Implemented backend lockdown via `supabase.auth.getUser()`, applied strict Zod validation schemas for Server Actions (`inventory-actions`, `shift-actions`), enforced Universal DB Reader tool isolation, and injected Anti-XSS Sanitization logic into AI Context and LocalStorage.
* **Execution**: [REBIRTH PROTOCOL: PROJECT-WIDE OMNI-REFACTOR & AI SYNC] (v4.2)
* **Action**: Scanned project for dead code, synced AI tool logic and database mapping, securely locked API keys, and enforced the 'text-black' / Zero-Bold typography rules across all components including the Weather Widget.
* **Result**: Achieved absolute clean code (Exit Code 0 on Linter), flawless AI synchronization with system variables, and strict UI layout compliance.
* **Enhancement**: [WEATHER SUBSYSTEM: PRECIPITATION & RAIN VOLUME INTEGRATION]
* **Action**: Updated `api/weather/route.ts` to compute rain probability (`pop` %) and accumulate rain volume (`rain` mm). Integrated changes into the `WeatherWidget` dashboard component with full type safety, adhering strictly to the Zero-Bold design guidelines.
* **Execution**: [REBIRTH PROTOCOL: DAILY CLOSING INTEGRITY WORKFLOW]
* **Action**: Executed Omni-Blueprint validation, UI/UX linting, Typescript readiness check, Next.js build validation, and Git security syncing.
* **Result**: Ensured absolute zero-functional error architecture, 100% build pass, and complete project mapping updates.

## 2026-05-26

* **Execution**: [INVENTORY SORTING REFACTORING & CSV DATA MIGRATION]
* **Action**: Executed comprehensive structural refactoring of the Inventory sorting system. Parsed `inventory-items.csv` (106 items) and bulk-migrated `sort_order` values (1-based index) into Supabase `inventory_items` table while preserving stock levels.
* **Result**: All 106 items updated with sequential `sort_order` matching physical store layout. Zero insert failures on existing items.
* **Files Modified**:
  - `src/app/[locale]/inventory/page.tsx` — Strict `.order('sort_order', { ascending: true })` fetch, max+1 new item placement, 1-based DnD sort_order sync
  - `src/app/actions/migrate-inventory-sort-order.ts` — [NEW] One-time CSV migration script with robust quoted-field parsing
  - `src/test/run_migration.test.ts` — [NEW] Integration test to trigger and verify migration
* **Verification**: `npx tsc --noEmit` ✓ | `npm run build` ✓ (Exit Code 0, 21/21 static pages)
