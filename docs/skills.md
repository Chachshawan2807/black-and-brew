# BLACKANDBREW ERP: SKILL HARVESTING & SYNERGY BUNDLING

> Last Scanned & Updated: 2026-06-12 (Documentation Sync v8.4)

## CAPABILITY INVENTORY (คลังความสามารถปัจจุบัน)

### 1. Data & Integration Capabilities

* **AI Data Gateway (`ai-data-gateway.ts`, AI-GATEWAY-P3)**: ประตูเดียวสำหรับทุก AI read — `COLUMN_ALIASES`, `TABLE_COLUMN_PRESETS` (DEC-069), `TABLE_MAX_LIMITS`, Service Role `adminClient`, `fetchTablePreset`, `fetchShiftsByDate`, `fetchInventorySummary` ผ่าน RPC `get_ai_store_status`
* **Universal DB Reader (`readTableTool`)**: เรียก gateway แทน direct Supabase — บังคับ preset ต่อตาราง, alias mapping, inventory snapshot route ไป `get_ai_store_status`, `shift_type` flatten สำหรับ shifts
* **Deterministic Daily Schedule (`DEC-068`)**: คำถามตารางงานรายวัน short-circuit ใน `/api/chat` — `isDailyScheduleQuery` → `fetchDailyShiftsByDate` → `formatScheduleChatResponse` → SSE โดยไม่พึ่ง LLM
* **getDailyShiftsTool**: Fallback tool สำหรับช่วงวันที่/กรณีที่ไม่ match daily detector — คืน `formatted_text` + grouped `front_store` / `other_duty` / `off_or_leave`
* **AI Tool Surface (SLIM_AI_TOOLS)**: `/api/chat` expose `getDailyShifts` + `readTable` + `internetSearchTool` (3 tools)
* **Internal Sources Tools (`internal-sources-tools.ts`)**: `getDailyReportSourcesTool` + `weatherTool` — ใช้โดย daily-report cron เท่านั้น (ไม่ expose ใน chat route)
* **Weather API Service (`/api/weather`)**: OpenWeatherMap พิกัดจาก `NEXT_PUBLIC_STORE_LAT/LON` (fallback 13.9312, 100.6756), แปลงเวลา `Asia/Bangkok`, รองรับ `pop` (%) และ `rain` (mm), แคช 1800s + `Cache-Control: s-maxage=1800` บนทุก response (success + fallback)
* **Tavily Client (`tavily-client.ts`)**: Shared HTTP client — SHA-256 query cache (TTL 1 ชม.), `SlidingWindowRateLimiter` 10 req/hr ต่อ userId, `search_depth: basic`, `max_results: 3`
* **External Intel Search (`internetSearchTool`)**: Zod + `sanitizePromptInput` → `fetchTavily()` สำหรับข่าว / เทรนด์ / ราคาตลาด / สภาพอากาศภายนอก
* **Executive Rules Engine (`executive-rules.ts`)**: กฎธุรกิจฝังใน System Prompt — database map, inventory thresholds, weather operational window (06:00–18:00 ICT), in-memory comparison policy
* **Inventory Stock Sync (`inventory-stock.ts`)**: Single source of truth — `mergeInventoryRealtimeUpdate`, `computeOrderQty`, `computeItemsToOrder`, `sanitizeStockValue`
* **Supabase Session Bridge (`supabase-session.ts`)**: `ensureSupabaseSession()` — anonymous sign-in หลัง PIN เพื่อผ่าน RLS `authenticated`
* **LINE Notification Push (`sendLineNotification`)**: Server Action ส่ง Push Text ผ่าน LINE Messaging API

### 2. UI/UX & Client Capabilities

* **Client Persistence & Hydration Safe**: แพตเทิร์น `isMounted` ใน `AIChatOverlay`, `PinGateway`, `CommandCenterGrid`, `ClickableDatePicker` — ป้องกัน Hydration Mismatch ก่อนอ่าน/เขียน `localStorage`
* **Debounced LocalStorage Persist**: `AIChatOverlay` เซฟประวัติแชท debounce 300ms, ข้ามช่วง streaming
* **Client Cache Utilities (`client-cache.ts`)**: `readCache` / `writeCache` / `isStale` / `mergeWithServer` — แพตเทิร์น TTL cache ฝั่ง client
* **useTransition Action Buttons**: Inventory quick entry + Maintenance submit/delete — UI ตอบสนองทันทีระหว่าง async
* **Dynamic Modal Splitting**: `PurchaseOrdersModal`, `MaintenanceModals`, `AIChatWrapper` โหลดผ่าน `next/dynamic { ssr: false }`
* **Optimistic UI Updates**: อัปเดต state ล่วงหน้าในหน้าคลังสินค้า / ตรวจนับก่อน sync Supabase (0ms perceived action)
* **Safe DnD Sensors (`dnd-sensors.ts`)**: `useSafeDndSensors` — Mouse 10px, Touch long-press 1s (tolerance 8px), Keyboard sortable
* **Premium Motion System (v6.9)**: `motion-presets.ts`, `PageTransition`, `FloatingAlert`/`FloatingToast`, CSS `.bb-modal-*`, `.bb-transition`
* **Full-Width Clickable Inputs**: `ClickableInput`, `ClickableDatePicker` — hitbox ครอบทั้ง container + portal calendar บนมือถือ
* **PWA Shell (`PwaRegister.tsx`)**: ลงทะเบียน Service Worker, Network-First + cache busting
* **Read-Only Session Guard (`AuthProvider`)**: `useReadOnly()` + `READ_ONLY_DENY_MSG` บล็อกการแก้ไขทุกหน้าที่ import
* **Zero-Bold Policy**: `font-normal`/`font-light` + `bg-[#fdfcf0]` latte theme ทุก component ที่สแกน

### 3. Performance & Security Capabilities

* **Thai Token Optimizer (`optimizeThaiTokens`)**: ตัด whitespace ซ้ำ, อักขระซ้ำ (5555→555, ๆๆๆ→ๆ), จุดซ้ำ — ก่อนส่งเข้า LLM
* **Centralized Security Layer (`src/lib/security/`)**: `sanitizePromptInput`, `sanitizeXssPayload`, `sanitizeScreenContext`, `ensureServerSession`, `requireServiceRoleKey`
* **Prompt Injection Guard**: กรอง jailbreak patterns (OWASP LLM01) ใน `/api/chat` ผ่าน shared sanitize lib
* **XSS Sanitization (`AIChatOverlay`)**: ลบ script/iframe/on* attributes/javascript: URLs จาก localStorage history และ bubble render ผ่าน `sanitizeXssPayload`
* **Chat Auth Gate**: `ensureServerSession()` + บล็อก read-only PIN (403) ก่อน AI tools ที่ bypass RLS
* **Dual Rate Limiting**: Chat endpoint 30 req/hr (`chatRateLimiter`) + Tavily 10 req/hr (`tavily-client`) — `SlidingWindowRateLimiter` in-memory
* **Smart Memory Window**: `buildSmartMemory` — 8 messages, char cap 2000/msg, `optimizeThaiTokens` per message
* **Dynamic System Prompt**: `buildSystemPrompt` inject เฉพาะ section ตาม intent scores — ลด prompt ~30–40%
* **Tool Output Sanitizer (`cleanToolOutput`)**: ตัด junk fields (`metadata`, UUID timestamps), depth-aware, ซ่อน `start_time`/`end_time` เมื่อมี `shift_type`
* **Intent Classification Engine**: Weighted `IntentScores` (schedule/inventory/weather/search/maintenance/holiday) + `INTENT_THRESHOLD=2` → dynamic `maxSteps` (3–5)
* **ToolLoopAgent Orchestrator**: Vercel AI SDK v6 — `gemini-2.5-flash`, `stepCountIs(maxSteps)`, `wrapTool` ทุก tool
* **EU AI Act Audit Trail (`logAuditTrail`)**: บันทึก metadata (userId, model, intent, tokenEstimate) — ไม่เก็บ PII
* **PIN Auth Gate (`auth.ts`)**: Server-side PIN verify, read-only session cookie, `assertWritableSession()` write guard
* **PinGateway Lockout**: นับความพยายามผิด + lockout ผ่าน `localStorage` (`bb_failed_attempts`, `bb_lockout_until`)

---

## SYNERGY BUNDLES (ชุดทักษะมัดรวมสำหรับ AI)

### [Bundle 1] External Intel Set 🌍

* **ส่วนประกอบ**: `internetSearchTool` + `tavily-client` (cache + rate limit) + `/api/weather` (Dashboard widget) + `readTable` (holidays) + `weatherTool` (cron only)
* **หน้าที่**: วิเคราะห์ปัจจัยภายนอก — AI ใช้ Tavily สำหรับข่าว/อากาศ/ตลาด, Widget ใช้ Weather API พิกัดร้าน, วันหยุดจากตาราง holidays

### [Bundle 2] High-Velocity UI Set ⚡

* **ส่วนประกอบ**: Optimistic Updates + `isMounted` Guard + debounced `localStorage` (300ms) + `useTransition` + `PageTransition` + `motion-presets` + `next/dynamic` modal split + `useSafeDndSensors`
* **หน้าที่**: UI ตอบสนองแบบ 0ms perceived latency, ปลอดภัยต่อ Hydration Error, DnD บนมือถือไม่ขัด scroll, lazy-load modal หนักเมื่อเปิดใช้งาน

### [Bundle 3] Safe Data Injector Set 🛡️

* **ส่วนประกอบ**: Zod Schema + `ai-data-gateway` + `adminClient` + `readTableTool` + `COLUMN_ALIASES` + `TABLE_COLUMN_PRESETS` + `TABLE_MAX_LIMITS` + `get_ai_store_status` RPC
* **หน้าที่**: อ่านข้อมูลฐานข้อมูลข้าม RLS อย่างปลอดภัย — ประตูเดียว, ดักชื่อคอลัมน์ผิด, บังคับ preset ต่อตาราง, จำกัด row count ตามประเภทข้อมูล

### [Bundle 4] Token Economy Set 💰

* **ส่วนประกอบ**: `optimizeThaiTokens` + `sanitizePromptInput` + Smart Memory Window + Dynamic System Prompt + `cleanToolOutput` + Tavily/Weather cache
* **หน้าที่**: ลดขนาด payload ภาษาไทยและ tool output ก่อนส่ง LLM, กรอง prompt injection, ตัดประวัติสนทนาเก่า, แคช query ซ้ำ

### [Bundle 5] Aesthetic Standardization Set 🎨

* **ส่วนประกอบ**: Zero-Bold Policy (`font-normal`/`font-light`) + Pastel/Latte Theming (`bg-[#fdfcf0]`) + Tailwind `transition-all duration-200` + `antialiased`
* **หน้าที่**: มาตรฐาน UI ใหม่ทุกชิ้น — Minimalist, ตัวอักษรบาง, โทนสีพาสเทลตามเวลา, ห้าม `font-bold` ใน AI response

### [Bundle 6] System Reconstruction & Recovery Set 🔄

* **ส่วนประกอบ**: RTK (Reconstruction ToolKit) + `adminClient` + LocalStorage Client Persistence + Undo/Redo Stack + `client-cache` merge
* **หน้าที่**: กู้คืนโครงสร้างและสถานะระบบเมื่อข้อมูลขัดข้อง — rollback state, sync กลับ DB ผ่าน `syncFullStateToDB`

### [Bundle 7] Context Mapping & Precision Strike Set 🗺️

* **ส่วนประกอบ**: RepoMap + RTK + `ai-data-gateway` + `EXECUTIVE_RULES.database_map`
* **หน้าที่**: มองเห็นโครงสร้างโปรเจกต์และ schema ฐานข้อมูลแบบประหยัด token — กู้คืนหรือแก้ไขด้วยพิกัดไฟล์/ตารางที่แม่นยำ

### [Bundle 8] Omni Cleanup & Performance Determinism Set ⚙️

* **ส่วนประกอบ**: production `console.log` purge + Map/Set indexing + AIChatOverlay hydration debounce + `next/dynamic` modal split + daily-report service-role-only guard + explicit column selects
* **หน้าที่**: ลด render cost, ลด network payload, security behavior เป็น deterministic — ไม่ fallback anon key แบบเงียบๆ

### [Bundle 9] Omni-Performance & Integrity Set 🚀

* **ส่วนประกอบ**: AI Data Gateway presets + Weather API `Cache-Control` + Tavily SHA cache + Thai Token Optimizer + Zero-Bold Enforcement + Server-Side API Key Lock
* **หน้าที่**: เร่งดึงข้อมูล, ลด payload, ประหยัด AI token, รักษามาตรฐาน UI, ล็อก API key ฝั่ง server

### [Bundle 10] AI Orchestrator Set 🤖

* **ส่วนประกอบ**: Intent Classification + `SLIM_AI_TOOLS` (getDailyShifts + readTable + internetSearch) + `ToolLoopAgent` + Deterministic Schedule Short-circuit + `EXECUTIVE_RULES` + `buildSystemPrompt` + `currentThaiDate`/`currentIsoDate` anchors + EU Audit Trail
* **หน้าที่**: จัดเส้นทาง reasoning แบบ deterministic — ตารางงานรายวันไม่ผ่าน LLM, เครื่องมือ 3 ตัว, ปรับ maxSteps ตาม intent, บังคับสรุปภาษาไทยหลัง tool call

### [Bundle 11] Session & Access Control Set 🔐

* **ส่วนประกอบ**: `verifyPin` + read-only cookie + `assertWritableSession` + `ensureServerSession` + Chat 403 read-only deny + `AuthProvider` + PinGateway lockout
* **หน้าที่**: ป้องกันการแก้ไขและ AI data exfiltration โดยไม่ได้รับอนุญาต — PIN เต็มสิทธิ์ vs read-only (111222), RLS authenticated bridge, lockout หลังพยายามผิดซ้ำ

### [Bundle 12] Inventory Truth Layer Set 📦

* **ส่วนประกอบ**: `inventory-stock.ts` + `mergeInventoryRealtimeUpdate` + `computeItemsToOrder` + `fetchInventorySummary` / `get_ai_store_status` + `updateInventoryStock` RPC + realtime `REPLICA IDENTITY FULL`
* **หน้าที่**: ซิงค์ `stock` ทุกหน้า (คลัง / ตรวจนับ / PO) จากจุดเดียว — optimistic merge ไม่ทับ field ที่มีอยู่, คำนวณ order_qty จาก threshold

### [Bundle 13] Thai Temporal Intelligence Set 🕐

* **ส่วนประกอบ**: `date-fns-tz` (`Asia/Bangkok`) + weather operational window (06:00–18:00) + Thai date format (`dd-MM-yyyy`) + dynamic time anchor ใน chat prompt + DATE INFERENCE RULES (ปี 2 หลัก, 3/6)
* **หน้าที่**: ทุกการอ้างอิงเวลา/วันที่ใน AI และรายงานสอดคล้องโซนไทย — ตัดข้อมูลนอกช่วงเวลาเปิดร้าน

### [Bundle 14] Secure Client Persistence Set 💾

* **ส่วนประกอบ**: `isMounted` guard + debounced `localStorage` + XSS sanitization + `CommandCenterGrid` order persist + `client-cache` TTL pattern
* **หน้าที่**: เก็บ state ฝั่ง client (แชท, ลำดับ widget, lockout) โดยไม่เกิด hydration error หรือ XSS จาก stored content

### [Bundle 15] API Throttle & Cache Economy Set ⏱️

* **ส่วนประกอบ**: `SlidingWindowRateLimiter` + Chat 30/hr gate + Tavily 10/hr + Tavily SHA-256 cache (1hr) + Weather `s-maxage=1800` + cache-before-rate-limit pattern
* **หน้าที่**: ป้องกัน abuse และลดค่าใช้จ่าย API — query ซ้ำไม่กิน rate slot, fallback payload เมื่อ upstream ล้ม

### [Bundle 16] Compliance & Audit Trace Set 📋

* **ส่วนประกอบ**: `logAuditTrail` (EU-ACT-001) + `ensureServerSession` + read-only deny + structured error responses (504 timeout) + `console.info` trace metadata (ไม่เก็บ PII)
* **หน้าที่**: ตรวจสอบย้อนหลังการใช้ AI ได้, ปฏิเสธ session ที่ไม่มีสิทธิ์อ่าน DB ผ่าน Service Role, แยก error type ชัดเจน

### [Bundle 17] Deterministic Schedule Fast-Path Set 📅

* **ส่วนประกอบ**: `detect-schedule-query` + `resolveScheduleTargetDate` + `fetch-daily-shifts` + `format-schedule-chat-response` + `create-deterministic-chat-stream` + `getDailyShiftsTool` fallback
* **หน้าที่**: ตอบคำถามตารางงานรายวันทันทีโดยไม่ใช้ token LLM — SSE stream, จัดกลุ่มกะตาม `metadata.location`, audit log แยก model `deterministic-schedule`

---

## SCHEMA GUARDRAILS (อ้างอิงจากโค้ดจริง)

* `inventory_items`: preset `id, name, unit, source, order_point, target_stock, stock, order_qty, updated_at` — alias `item_name→name`, `quantity→stock`, `min_stock→order_point`
* `service_records`: preset ครบ 12 คอลัมน์ — alias `machine_name→equipment`, `maintenance_date→start_date`, `operator→person_in_charge`
* `shifts`: alias `shift_date→start_time`, `employee→employee_id` — ใช้ `shift_type` จาก metadata ไม่ใช่ `start_time` เป็นเวลาเข้างาน
* `profiles`: alias `name→full_name`
* AI Chat tools ที่ active: `getDailyShifts` + `readTable` + `internetSearchTool` (SLIM_AI_TOOLS)
* Internal-only tools (cron): `getDailyReportSourcesTool`, `weatherTool`
