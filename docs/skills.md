# BLACKANDBREW ERP: SKILL HARVESTING & SYNERGY BUNDLING

> Last Scanned & Updated: 2026-06-07 (VELOCITY-REFACTOR-PROTOCOL v8.0)

## CAPABILITY INVENTORY (คลังความสามารถปัจจุบัน)

### 1. Data & Integration Capabilities

* **Universal DB Reader (`readTableTool`)**: ดึงข้อมูลจากตารางผ่าน `adminClient` (Service Role — Bypass RLS) พร้อม `COLUMN_ALIASES`, `TABLE_COLUMN_PRESETS` (ห้าม `*`), และ table-specific row limits
* **Slim AI Tool Surface (DEC-065)**: `/api/chat` จำกัดเครื่องมือเหลือ `readTable` + `internetSearchTool` เท่านั้น — กะงาน/วันหยุด/สต็อกผ่าน readTable, สภาพอากาศภายนอกผ่าน internetSearch
* **Internal Sources Tools (`internal-sources-tools.ts`)**: ใช้โดย daily-report cron เท่านั้น (ไม่ expose ใน chat route)
* **Weather API Service (`/api/weather`)**: OpenWeatherMap พิกัดตำบลบึงคำพร้อย (13.9312, 100.6756), แปลงเวลา `Asia/Bangkok`, รองรับ `pop` (%) และ `rain` (mm), แคช 1800s + `Cache-Control: s-maxage=1800` บนทุก response (success + fallback)
* **External Intel Search (`internetSearchTool`)**: Tavily API (`search_depth: basic`, `max_results: 3`) สำหรับข่าว / เทรนด์ / ราคาตลาดภายนอก
* **Executive Rules Engine (`executive-rules.ts`)**: กฎธุรกิจฝังใน System Prompt — database map, inventory thresholds, weather operational window (06:00–18:00 ICT), in-memory comparison policy
* **Inventory Stock Sync (`inventory-stock.ts`)**: Single source of truth — `mergeInventoryRealtimeUpdate`, `computeOrderQty`, `computeItemsToOrder`, `sanitizeStockValue`
* **Supabase Session Bridge (`supabase-session.ts`)**: `ensureSupabaseSession()` — anonymous sign-in หลัง PIN เพื่อผ่าน RLS `authenticated`
* **LINE Notification Push (`sendLineNotification`)**: Server Action ส่ง Push Text ผ่าน LINE Messaging API
* **RepoMap Context Tool (`repo-map`)**: สแกนโครงสร้างโปรเจกต์สร้าง `PROJECT_MAP.md` แบบ Zero-dependency

### 2. UI/UX & Client Capabilities

* **Client Persistence & Hydration Safe**: แพตเทิร์น `isMounted` ใน `AIChatOverlay`, `PinGateway`, `CommandCenterGrid`, `ClickableDatePicker` — ป้องกัน Hydration Mismatch ก่อนอ่าน/เขียน `localStorage`
* **Debounced LocalStorage Persist**: `AIChatOverlay` เซฟประวัติแชทแบบ debounce, ข้ามช่วง streaming
* **Debounced Quick Search**: หน้าคลังสินค้า — ช่องค้นหาด่วน debounce 150ms ลด re-filter lag
* **useTransition Action Buttons**: Inventory quick entry + Maintenance submit/delete — UI ตอบสนองทันทีระหว่าง async
* **Dynamic Modal Splitting**: `PurchaseOrdersModal` + `MaintenanceModals` โหลดผ่าน `next/dynamic { ssr: false }`
* **Optimistic UI Updates**: อัปเดต state ล่วงหน้าในหน้าคลังสินค้า / ตรวจนับก่อน sync Supabase (0ms perceived action)
* **Premium Motion System (v6.9)**: `motion-presets.ts`, `PageTransition`, `FloatingAlert`/`FloatingToast`, CSS `.bb-modal-*`, `.bb-transition`
* **Full-Width Clickable Inputs**: `ClickableInput`, `ClickableDatePicker` — hitbox ครอบทั้ง container + portal calendar บนมือถือ
* **PWA Shell (`PwaRegister.tsx`)**: ลงทะเบียน Service Worker, Network-First + cache busting
* **Read-Only Session Guard (`AuthProvider`)**: `useReadOnly()` + `READ_ONLY_DENY_MSG` บล็อกการแก้ไขทุกหน้าที่ import

### 3. Performance & Security Capabilities

* **Thai Token Optimizer (`optimizeThaiTokens`)**: ตัด whitespace ซ้ำ, อักขระซ้ำ (5555→555, ๆๆๆ→ๆ), จุดซ้ำ — ก่อนส่งเข้า LLM
* **Centralized Security Layer (`src/lib/security/`)**: `sanitizePromptInput`, `sanitizeXssPayload`, `sanitizeScreenContext`, `ensureServerSession`, `requireServiceRoleKey`
* **Prompt Injection Guard**: กรอง jailbreak patterns (OWASP LLM01) ใน `/api/chat` ผ่าน shared sanitize lib
* **XSS Sanitization (`AIChatOverlay`)**: ลบ script/iframe/on* attributes/javascript: URLs จาก localStorage history และ bubble render ผ่าน `sanitizeXssPayload`
* **LINE Push Isolation (`line-notify.ts`)**: Cron route เรียก `pushLineMessage` โดยตรง; server action ต้อง auth
* **Sliding Window Memory**: `slice(-MAX_MEMORY_MESSAGES)` + per-message char cap + `optimizeThaiTokens` ใน chat route
* **Intent Classification Engine**: Weighted `IntentScores` (schedule/inventory/weather/search/…) แทน boolean regex เดี่ยว — รองรับ multi-intent
* **ToolLoopAgent Orchestrator**: Vercel AI SDK v6 — multi-step tool calls ผ่าน `selectTools()` + `maxSteps` แบบ dynamic
* **PIN Auth Gate (`auth.ts`)**: Server-side PIN verify, read-only session cookie, `assertWritableSession()` write guard
* **PinGateway Lockout**: นับความพยายามผิด + lockout ผ่าน `localStorage` (`bb_failed_attempts`, `bb_lockout_until`)
* **Singleton Database Connection**: Supabase client ลด event rate (2/sec)
* **Inventory RLS Hardening**: authenticated-only policies หลัง anonymous sign-in

---

## SYNERGY BUNDLES (ชุดทักษะมัดรวมสำหรับ AI)

### [Bundle 1] External Intel Set 🌍

* **ส่วนประกอบ**: `internetSearchTool` + `/api/weather` (Dashboard widget) + `readTable` (holidays)
* **หน้าที่**: วิเคราะห์ปัจจัยภายนอก — AI ใช้ internetSearch สำหรับอากาศ/ข่าว, Widget ใช้ Weather API พิกัด 13.9312/100.6756, วันหยุดจากตาราง holidays

### [Bundle 2] High-Velocity UI Set ⚡

* **ส่วนประกอบ**: Optimistic Updates + `isMounted` Guard + debounced `localStorage` + `PageTransition` + `motion-presets` + `.bb-transition`
* **หน้าที่**: UI ตอบสนองแบบ 0ms perceived latency, ปลอดภัยต่อ Hydration Error, แอนิเมชันนุ่มนวลโดยไม่เปลี่ยน layout desktop/mobile, lazy-load modal หนักเมื่อเปิดใช้งาน

### [Bundle 3] Safe Data Injector Set 🛡️

* **ส่วนประกอบ**: Zod Schema + `adminClient` + `readTableTool` + `COLUMN_ALIASES` + `TABLE_COLUMN_PRESETS` + table-specific limits
* **หน้าที่**: อ่านข้อมูลฐานข้อมูลข้าม RLS อย่างปลอดภัย — ดักชื่อคอลัมน์ผิด (Postgres 42703), บังคับ preset ต่อตาราง, จำกัด row count ตามประเภทข้อมูล

### [Bundle 4] Token Economy Set 💰

* **ส่วนประกอบ**: `optimizeThaiTokens` + `sanitizeInput` + Sliding Window Memory (`slice` + char cap)
* **หน้าที่**: ลดขนาด payload ภาษาไทยก่อนส่ง LLM, กรอง prompt injection, ตัดประวัติสนทนาเก่าเพื่อประหยัด token โดยคงบริบทล่าสุด

### [Bundle 5] Aesthetic Standardization Set 🎨

* **ส่วนประกอบ**: Zero-Bold Policy (`font-normal`/`font-light`) + Pastel/Latte Theming (`bg-[#fdfcf0]`) + Tailwind `transition-all duration-200`
* **หน้าที่**: มาตรฐาน UI ใหม่ทุกชิ้น — Minimalist, ตัวอักษรบาง, โทนสีพาสเทลตามเวลา, antialiased

### [Bundle 6] System Reconstruction & Recovery Set 🔄

* **ส่วนประกอบ**: RTK (Reconstruction ToolKit) + `adminClient` + LocalStorage Client Persistence + Undo/Redo Stack
* **หน้าที่**: กู้คืนโครงสร้างและสถานะระบบเมื่อข้อมูลขัดข้อง — rollback state, sync กลับ DB ผ่าน `syncFullStateToDB`

### [Bundle 7] Context Mapping & Precision Strike Set 🗺️

* **ส่วนประกอบ**: RepoMap + RTK + `readTableTool` + `EXECUTIVE_RULES.database_map`
* **หน้าที่**: มองเห็นโครงสร้างโปรเจกต์และ schema ฐานข้อมูลแบบประหยัด token — กู้คืนหรือแก้ไขด้วยพิกัดไฟล์/ตารางที่แม่นยำ

### [Bundle 8] Omni Cleanup & Performance Determinism Set ⚙️

* **ส่วนประกอบ**: production `console.log` purge + Map/Set indexing (`LiveShiftList`) + AIChatOverlay hydration debounce + `next/dynamic` modal split + daily-report service-role-only guard
* **หน้าที่**: ลด render cost, ลด network payload, security behavior เป็น deterministic — ไม่ fallback anon key แบบเงียบๆ

### [Bundle 9] Omni-Performance & Integrity Set 🚀

* **ส่วนประกอบ**: Explicit Supabase field selection + Weather API `Cache-Control` + Thai Token Optimizer + Zero-Bold Enforcement + Server-Side API Key Lock
* **หน้าที่**: เร่งดึงข้อมูล, ลด payload, ประหยัด AI token, รักษามาตรฐาน UI, ล็อก API key ฝั่ง server

### [Bundle 10] AI Orchestrator Set 🤖

* **ส่วนประกอบ**: Intent Classification + `SLIM_AI_TOOLS` (readTable + internetSearch) + `ToolLoopAgent` + `EXECUTIVE_RULES` + `optimizeThaiTokens` on system prompt + `currentThaiDate`/`currentIsoDate` anchors
* **หน้าที่**: จัดเส้นทาง reasoning แบบ deterministic ด้วยเครื่องมือ 2 ตัว, ปรับ maxSteps ตาม intent, บังคับสรุปภาษาไทยหลัง tool call

### [Bundle 11] Session & Access Control Set 🔐

* **ส่วนประกอบ**: `verifyPin` + read-only cookie + `assertWritableSession` + `ensureSupabaseSession` + `AuthProvider` + PinGateway lockout
* **หน้าที่**: ป้องกันการแก้ไขโดยไม่ได้รับอนุญาต — PIN เต็มสิทธิ์ vs read-only (111222), RLS authenticated bridge, lockout หลังพยายามผิดซ้ำ

### [Bundle 12] Inventory Truth Layer Set 📦

* **ส่วนประกอบ**: `inventory-stock.ts` + `mergeInventoryRealtimeUpdate` + `computeItemsToOrder` + `updateInventoryStock` RPC + realtime `REPLICA IDENTITY FULL`
* **หน้าที่**: ซิงค์ `stock` ทุกหน้า (คลัง / ตรวจนับ / PO) จากจุดเดียว — optimistic merge ไม่ทับ field ที่มีอยู่, คำนวณ order_qty จาก threshold

### [Bundle 13] Thai Temporal Intelligence Set 🕐

* **ส่วนประกอบ**: `date-fns-tz` (`Asia/Bangkok`) + weather operational window (06:00–18:00) + Thai date format (`dd-MM-yyyy`) + dynamic time anchor ใน chat prompt
* **หน้าที่**: ทุกการอ้างอิงเวลา/วันที่ใน AI และรายงานสอดคล้องโซนไทย — ตัดข้อมูลนอกช่วงเวลาเปิดร้าน

### [Bundle 14] Secure Client Persistence Set 💾

* **ส่วนประกอบ**: `isMounted` guard + debounced `localStorage` + XSS sanitization + `CommandCenterGrid` order persist
* **หน้าที่**: เก็บ state ฝั่ง client (แชท, ลำดับ widget, lockout) โดยไม่เกิด hydration error หรือ XSS จาก stored content

---

## SCHEMA GUARDRAILS (อ้างอิงจากโค้ดจริง)

* `inventory_items`: preset `id, name, unit, source, order_point, target_stock, stock, order_qty, updated_at` — alias `item_name→name`, `quantity→stock`, `min_stock→order_point`
* `service_records`: preset ครบ 12 คอลัมน์ — alias `machine_name→equipment`, `maintenance_date→start_date`, `operator→person_in_charge`
* `shifts`: alias `shift_date→start_time`, `employee→employee_id`
* `profiles`: alias `name→full_name`
* AI Chat tools ที่ active: `readTable` + `internetSearchTool` เท่านั้น (SLIM_AI_TOOLS, DEC-065)
