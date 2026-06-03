# BLACKANDBREW ERP: SKILL HARVESTING & SYNERGY BUNDLING

> Last Scanned & Updated: 2026-06-04

## CAPABILITY INVENTORY (คลังความสามารถปัจจุบัน)

### 1. Data & Integration Capabilities

* **Universal DB Reader (`readTableTool`)**: ระบบดึงข้อมูลจากตารางแบบ Bypasses RLS (ผ่าน `adminClient`) สำหรับให้ AI ใช้วิเคราะห์ข้อมูลภายในร้าน
* **Weather API Service (`/api/weather`)**: การเชื่อมต่อ OpenWeatherMap แบบแคชข้อมูล (1800s) พร้อมการแปลงเวลาโซนไทย (Asia/Bangkok)
* **External Intel Search (`internetSearchTool`)**: เครื่องมือค้นหาอินเทอร์เน็ตผ่าน Tavily API สำหรับสืบค้นสภาพแวดล้อม ข่าวสาร โดยล็อกพิกัดเป้าหมาย "ตำบลบึงคำพร้อย" เสมอ
* **LINE Notification Push Service (`sendLineNotification`)**: ฟังก์ชัน Server Action สำหรับส่ง Push Text Message ผ่าน LINE Messaging API (`@line/bot-sdk` v11.x) ไปยัง User ID / Group ID ที่ระบุ — เป็น Callable Utility แบบแยกส่วนสำหรับต่อยอดระบบแจ้งเตือนอัตโนมัติ
* **RepoMap Context Tool (`repo-map`)**: เครื่องมือสแกนโครงสร้างโปรเจกต์และสร้างแผนผังไฟล์ยึดโยงบริบท (`PROJECT_MAP.md`) แบบ Zero-dependency ช่วยลดการใช้ Token และกำหนดพิกัดไฟล์ได้อย่างแม่นยำก่อนการแก้ไขหรือตรวจสอบระบบ

### 2. UI/UX & Client Capabilities

* **Client Persistence & Hydration Safe**: ใช้แพตเทิร์น `isMounted` เพื่อแก้ไขปัญหา Hydration Mismatch ของ Next.js ตอนโหลดหน้าจอแรกและ LocalStorage
* **Optimistic UI Updates**: การอัปเดต State ล่วงหน้า (เช่น ฟังก์ชันในคลังสินค้า) เพื่อให้ผู้ใช้รู้สึกว่าระบบตอบสนองทันที (0ms Action) ก่อนส่งเข้าฐานข้อมูล
* **Minimalist Aesthetics (UI/UX PRO MAX)**: การออกแบบคุมโทนพาสเทล (Pastel/Latte Theming) ห้ามใช้ตัวหนา (Zero-Bold Policy) และแฝง Micro-animations (`animate-in fade-in`)

### 3. Performance & Security Capabilities

* **Thai Token Optimizer**: ฟังก์ชัน `optimizeThaiTokens` ตัดอักขระซ้ำ (เช่น 5555, ๆๆๆ) ลดการใช้ Token ฝั่งภาษาไทยก่อนส่งให้ LLM
* **Prompt Injection Guard**: การกรองคำสั่งแปลกปลอม (Jailbreak) ออกจาก Context สภาพแวดล้อม
* **Singleton Database Connection**: ออปติไมซ์ Client Supabase ลดจำนวน Event (2 per sec)

---

## SYNERGY BUNDLES (ชุดทักษะมัดรวมสำหรับ AI)

ชุดคอมโบที่ผสานความสามารถต่างๆ เข้าด้วยกัน เพื่อให้ AI นำไปเรียกใช้งานได้อย่างมีประสิทธิภาพสูงสุด

### [Bundle 1] "External Intel Set" 🌍

* **ส่วนประกอบ**: `internetSearchTool` + `Weather API`
* **หน้าที่**: วิเคราะห์ปัจจัยภายนอกร้านแบบ Real-time เช่น สภาพอากาศปัจจุบัน ข่าวสารท้องถิ่น หรือวันหยุด เพื่อพยากรณ์ยอดขายหรือการจัดเตรียมวัตถุดิบ

### [Bundle 2] "High-Velocity UI Set" ⚡

* **ส่วนประกอบ**: `Optimistic Updates` + `isMounted Guard` + `Micro-animations`
* **หน้าที่**: การสร้างและเรนเดอร์หน้าจอ Component ใหม่โดยเน้นการตอบสนองที่ 0ms และปลอดภัยต่อ Hydration Error พร้อมแอนิเมชันตอนปรากฏตัว

### [Bundle 3] "Safe Data Injector Set" 🛡️

* **ส่วนประกอบ**: `Zod Schema` + `adminClient` + `readTableTool`
* **หน้าที่**: ชุดอ่านและเขียนข้อมูลขั้นสูงที่ใช้ Service Role Key ข้ามข้อจำกัด RLS อย่างปลอดภัย โดยมีการตรวจสอบโครงสร้างข้อมูลอย่างเข้มงวด

### [Bundle 4] "Token Economy Set" 💰

* **ส่วนประกอบ**: `thaiTokenOptimizer` + `Prompt Injection Guard` + `Sliding Window Memory (slice)`
* **หน้าที่**: ชุดทำความสะอาดและลดขนาดท่อส่งข้อความภาษาไทยก่อนส่งเข้า LLM ช่วยประหยัด Token และรักษาความปลอดภัยจากคำสั่งแทรกแซง

### [Bundle 5] "Aesthetic Standardization Set" 🎨

* **ส่วนประกอบ**: `Zero-Bold Policy` + `Pastel/Latte Theming` + `Tailwind Transitions`
* **หน้าที่**: มาตรฐานการเขียน UI ใหม่ทุกชิ้นต้องคงคอนเซปต์ Minimalist ตัวอักษรบาง และใช้สีโทนสว่างสบายตา

### [Bundle 6] "System Reconstruction & Recovery Set" 🔄

* **ส่วนประกอบ**: `RTK (The Reconstruction ToolKit)` + `adminClient (Service Role)` + `LocalStorage Client Persistence`
* **หน้าที่**: ใช้สำหรับกู้คืนโครงสร้างและสถานะของระบบหรือตารางข้อมูลหน้าร้านใน 0ms เมื่อเกิดกรณีข้อมูลขัดข้อง หรือตรวจพบความคลาดเคลื่อนของข้อมูลประวัติ (Undo/Redo Stack & Rollback State)

### [Bundle 7] "Context Mapping & Precision Strike Set" 🗺️

* **ส่วนประกอบ**: `RepoMap (repomap.py)` + `RTK (The Reconstruction ToolKit)` + `readTableTool`
* **หน้าที่**: การจำลองแผนผังของโครงสร้างโปรเจกต์แบบประหยัด Token ร่วมกับการอ่านข้อมูลระดับโครงสร้างฐานข้อมูลผ่าน `readTableTool` เพื่อให้ AI มองเห็นการเชื่อมโยงระบบอย่างทะลุปรุโปร่ง และกู้คืนข้อมูลหรือจัดความสมมาตรทางดีไซน์แบบ Zero Functional Errors เมื่อเกิดการล่มหรือผิดพลาด

### [Bundle 8] "Omni Cleanup & Performance Determinism Set" ⚙️

* **ส่วนประกอบ**: `console-log purge` + `Map/Set indexing` + `AIChatOverlay hydration debounce` + `dynamic modal split` + `daily-report security guard`
* **หน้าที่**: ลดต้นทุน render/คำนวณ, ลด payload network บนจุดที่หนัก, และทำให้ security behavior เป็น deterministic โดยไม่ fallback ไปคีย์ anon แบบเงียบๆ

### [Bundle 9] "Omni-Performance & Integrity Set" 🚀
* **ส่วนประกอบ**: `Explicit Supabase Field Selection` + `Weather API Cache-Control` + `Thai Token Optimizer` + `Zero-Bold Policy Enforcement` + `Server-Side API Key Lock`
* **หน้าที่**: เพิ่มความเร็วในการดึงข้อมูลและเรนเดอร์ UI, ลดขนาด Network Payload, ประหยัด Token ของ AI, รักษามาตรฐานการแสดงผล UI และรับประกันความปลอดภัยของ API Key ระดับสูงสุด



* **Schema Guardrails (CSV-Verified)**: `readTableTool` ใช้ preset + alias mapping สำหรับ `inventory_items` (`name`, `stock`, `order_point`) และ `service_records` (เช่น `start_date`, `equipment`, `person_in_charge`, ฯลฯ) เพื่อป้องกัน Postgres 42703 จากการระบุชื่อคอลัมน์ที่ผิดพลาด
* **AI Orchestrator Slim Tools**: `/api/chat` จำกัดเครื่องมือของ AI ให้เหลือเพียง `readTable` และ `internetSearchTool` เพื่อควบคุมและทำให้ reasoning path มีความ deterministic
