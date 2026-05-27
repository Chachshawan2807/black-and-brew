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
  * `src/app/[locale]/inventory/page.tsx` — Strict `.order('sort_order', { ascending: true })` fetch, max+1 new item placement, 1-based DnD sort_order sync
  * `src/app/actions/migrate-inventory-sort-order.ts` — [NEW] One-time CSV migration script with robust quoted-field parsing
  * `src/test/run_migration.test.ts` — [NEW] Integration test to trigger and verify migration
* **Verification**: `npx tsc --noEmit` ✓ | `npm run build` ✓ (Exit Code 0, 21/21 static pages)

* **Execution**: [DAILY LINE NOTIFICATION PROTOCOL]
* **Action**: Created Vercel Cron scheduled endpoint (`/api/daily-report`) to trigger at 00:00 UTC (07:00 ICT) every day. Built a compiler script that aggregates shift data, strictly filtered inventory alerts (`stock <= order_point + 2`), OpenWeatherMap forecast (06:30 - 18:00 ICT window), and upcoming public holidays.
* **Result**: Implemented automated, token-free, rule-based push notifications sent daily via LINE Messaging API, protected by `CRON_SECRET`.
* **Files Modified**:
  * `src/app/actions/daily-report-actions.ts` — [NEW] Core data compiler logic
  * `src/app/api/daily-report/route.ts` — [NEW] Vercel Cron Endpoint
  * `vercel.json` — [NEW] Schedule configuration
  * `.env.example` — Added CRON_SECRET reference
* **Verification**: `npx tsc --noEmit` ✓ | `npm run build` ✓ (Exit Code 0)

## 2026-05-27

* **Execution**: [REBIRTH PROTOCOL: PERFORMANCE-DRIVEN OMNI-REFACTOR & CODE PURGE] (v4.4)
* **Action**: ตัด `console.log()` ในโหมด production paths เพื่อลด CPU/latency, เพิ่ม fixed perf indexing ใน `LiveShiftList`, ปรับ `AIChatOverlay` ให้ quick actions ครบ 4 ปุ่มและรวม hydration effects 2 ตัว พร้อม debounce การ persist localStorage
* **Action**: ลด payload ใน `ScheduleClient` โดยหลีกเลี่ยง `select('*')` และระบุคอลัมน์ที่ใช้จริงตาม UI
* **Action**: ทำ code splitting สำหรับ modal หนัก (`PurchaseOrdersModal`) ผ่าน `next/dynamic` (`ssr:false`)
* **Action**: Harden ความปลอดภัยใน `daily-report-actions.ts` โดยตัด fallback จาก `NEXT_PUBLIC_SUPABASE_ANON_KEY` เหลือเฉพาะ `SUPABASE_SERVICE_ROLE_KEY` พร้อม guard เมื่อ key หาย และอัปเดต unit test ให้ตั้งค่า service role key
* **Result**: โค้ดสะอาดขึ้น, ลดภาระ render/คำนวณ, ลด payload network, และ security behavior เป็น deterministic
* **Verification**: `npx tsc --noEmit` ✓ | `npm run build` ✓ (Exit Code 0)

* **Execution**: [REBIRTH PROTOCOL: DAILY CLOSING INTEGRITY WORKFLOW] (2026-05-27, round 2)
* **Action**: �׹�ѹʤ��� inventory_items ��� service_records � eadTableTool ��� CSV ��ԧ, ���� alias mapping �ѹ query �������Դ, ����ִ service_records preset �����������ԧ��ҹ��
* **Action**: ��Ѻ AIChatOverlay �� high-contrast black policy (w-full max-w-2xl + md:w-[650px], order-2 border-black, quick chips 4 �����ҡ QUICK_ACTIONS, �¡ useEffect ��Ŵ/૿ localStorage)
* **Action**: ��Ѻ WeatherWidget ��餧�ԡѴ�֧�Ӿ���� ���١��, �ç hourly Ẻ���ǹ͹, ��Тͺ�ӪѴ��� skeleton/����
* **Action**: Ŵ����ͧ���� /api/chat �������� eadTable + internetSearchTool ������׹�ѹ dynamic time anchor (currentThaiDate, currentIsoDate)
* **Verification**: 
px tsc --noEmit ? | 
pm run build ? (Exit Code 0)

