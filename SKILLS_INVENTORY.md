# 🛠️ AI Skills & Tools Inventory (Master List)

| Skill / Tool Name | Capability (English) | ความสามารถ (ภาษาไทย) | Status / Path |
| :--- | :--- | :--- | :--- |
| **Gemini API** | Multi-modal generation (Node.js SDK & Python). | การสร้างเนื้อหาผ่าน Node.js SDK และ Python | `src/lib/ai/gemini.ts` |
| **Google Cloud WAF** | Security guidance for workloads based on Well-Architected Framework. | แนวทางการรักษาความปลอดภัยบนคลาวด์ตามมาตรฐาน WAF ของ Google | `.agents/skills/google-cloud-waf-security/` |
| **UI/UX PRO MAX** | Minimalist, pastel-themed design synced with Thailand GMT+7. | การคุมโทนดีไซน์แบบมินิมอลพาสเทล เชื่อมโยงกับเวลาท้องถิ่นไทย | `AGENTS.md` |
| **RTK (Real-Time Toolkit)** | Low-latency AI operations and state synchronization via Rust. | การประมวลผล AI ความเร็วสูงและการซิงค์ข้อมูลผ่านภาษา Rust | `Cargo Binary (v0.39.0)` |
| **Rust Toolchain** | High-performance systems programming and safe concurrency. | การเขียนโปรแกรมระดับระบบที่มีประสิทธิภาพสูงและความปลอดภัยสูง | `v1.95.0` |
| **Next.js & Supabase** | Full-stack web framework with real-time database and RLS. | เฟรมเวิร์กทำเว็บแบบ Full-stack พร้อมระบบฐานข้อมูลเรียลไทม์ | `Project Core (v16.2)` |
| **Node.js Runtime** | Scalable server-side JavaScript environment. | สภาพแวดล้อมรันไทม์ JavaScript ฝั่งเซิร์ฟเวอร์ที่ปรับขนาดได้ | `v22.x (npm 11.12)` |
| **Python Runtime** | Stable environment for legacy scripts and AI tools. | ภาษาโปรแกรมสำหรับการประมวลผล AI (เวอร์ชันเสถียร) | `v3.12.x (Stable)` |
| **jcode** [V2] | **Code Context Prep** — Deep structural analysis of repo before every Audit. | **Code Context Prep** — วิเคราะห์โครงสร้าง repo เชิงลึกก่อน Audit ทุกครั้ง (Mandatory) | `.antigravity/tools/jcode` |
| **design-md** [V2] | **Document Standard** — 70+ brand design systems used as layout reference. | **Document Standard** — ใช้เป็นฐานอ้างอิงโครงสร้าง .md ทุกไฟล์ที่สร้างใหม่ (Mandatory) | `.antigravity/references/design-md` |
| **Mem0** | Long-term memory (Node.js & Python implementation). | ระบบความจำระยะยาวสำหรับ AI (รองรับทั้ง Node.js และ Python) | `src/lib/ai/memory.ts` |
| **aider/RepoMap** | Codebase context map generator — reduces token cost before Audit tasks. | สร้างแผนที่โค้ดแบบอัตโนมัติ — ลด Token Cost ก่อนเริ่ม Audit | `.antigravity/tools/memory-engine/aider` |
| **GraphRAG** | Knowledge-graph deep context extraction for unstructured private data. | ดึงบริบทเชิงลึกจากข้อมูลเอกชนผ่าน Knowledge Graph | `.antigravity/tools/memory-engine/graphrag` |
| **Token Monitoring** | Token usage verification (Node.js & Python). | ตรวจสอบปริมาณ Token (รองรับทั้ง Node.js และ Python) | `src/lib/ai/token-utils.ts` |
| **Token Awareness** | Mandatory token status notification before major Audit tasks. | แจ้งจำนวน Token ที่เหลืออยู่ให้ทราบเสมอก่อนเริ่มงาน Audit ชุดใหญ่ | `Protocol Rule (Ref: token-utils.ts)` |
| **Flattened UI Architecture** | Zero-layer DOM rendering for complex inputs using sr-only. | ลดการซ้อนทับของเลเยอร์ DOM ใน Input ทั้งหมดด้วย sr-only เพื่อประสิทธิภาพและความสวยงาม | `src/components/ui/` |
| **Optimistic UI Updates** | Instant UI state synchronization using functional updates before/during DB sync. | การอัปเดตสถานะ UI ทันทีผ่าน Functional Update ก่อนหรือระหว่างการซิงค์ฐานข้อมูล เพื่อความรวดเร็วสูงสุด | `ScheduleClient.tsx` |
| **Real-time Inline Grid Editing** | Google Sheets-style single-layer data grids with auto-sync `onBlur`. | ระบบตารางแบบ Google Sheets ที่แก้ไขข้อมูลใน Cell ได้โดยตรง พร้อมซิงค์ข้อมูลอัตโนมัติ | `inventory/page.tsx` |
| **Database Schema Evolution & Recovery** | Executing additive schema changes (e.g., ADD COLUMN) safely to recover from ORM/SQL mapping errors. | การแก้ไขปัญหาและอัปเดต Schema ของฐานข้อมูลอย่างปลอดภัยเพื่อกู้คืนระบบจากข้อผิดพลาด Mapping | `add_inventory_sort_order.sql` |
| **Dynamic Metadata-Driven UI** | Fetching and updating layout/label configurations directly from Supabase. | ควบคุมเลย์เอาต์และชื่อหัวตารางจาก JSON ในฐานข้อมูลโดยตรง (No Hardcoding) | `inventory_config` |
| **State History Management** | Implementing an Undo/Redo stack across complex 2D grids and pushing partial/full states to the backend. | สร้างระบบประวัติ (Undo/Redo) ให้ตาราง พร้อมควบคุมการซิงค์ข้อมูลลงฐานข้อมูลอย่างแม่นยำ | `inventory/page.tsx` |
| **Advanced Pastel UI Design** | Implementing super-soft pastel aesthetics with 3xl rounding, backdrop blurs, and strict font-normal constraints. | การออกแบบ UI แบบพาสเทลมินิมอลขั้นสูง ลบมุมโค้ง 3xl และควบคุมความหนาฟอนต์อย่างเข้มงวด | `inventory/page.tsx` |
| **Synchronous Undo/Redo Persistence** | Full snapshot upserting and deletion diffing to ensure the database matches time-travel UI states. | การซิงค์สถานะประวัติกับฐานข้อมูลแบบเต็มรูปแบบ เพื่อรับประกันว่า Database จะตรงกับสิ่งที่แสดงบนจอ 100% | `inventory/page.tsx` |