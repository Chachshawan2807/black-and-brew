SPEC_ARCHITECTURE.md: BLACK-AND-BREW ERP SYSTEM (v2.2)
Status: Approved for Implementation | Owner: Senior Architect Agent
Methodology: Outcome-First, Chained Thinking, R0/R1/R2 Risk Assessment  

0. System Overview & Identity
Project Identity: BLACK-AND-BREW Enterprise Resource Planning (ERP) System (v2026).
Primary Purpose: ระบบจัดการตารางงานพนักงาน (Scheduling) และระบบบันทึกประวัติการซ่อมบำรุงอุปกรณ์ (Maintenance System) รวมถึงระบบจัดการคลังสินค้าอัจฉริยะ (Smart Inventory).

Core Context & Constraints
Target Personnel: พนักงานหลัก 9 ท่าน.
Operational Logic: บทบาทพนักงานสลับกันได้อิสระ รองรับกะงานพิเศษทุกรูปแบบ.
Timezone: BKK (GMT+7) (Strict Enforcement).
Tech Stack: Next.js 16, React 19, Supabase, Tailwind CSS, Vercel Edge Runtime.

1. UI/UX & Typography Standards (R0 Visual Integrity)
Compact & Adaptive UI:
* หน้าต่าง Modal และ Form ใช้ระบบ Grid เพื่อลดความสูง
* Sidebar ปรับขนาดอัตโนมัติ (Dynamic Width)

Typography & Visibility (Strict Rules):
* ห้ามใช้ตัวอักษรแบบหนา (No Bold Text) ในทุกส่วนของแอปพลิเคชัน  
* กรณีใช้สีเทา ต้องเป็นสีเทาแบบเข้ม (Dark Gray / #555555 หรือเข้มกว่า) เพื่อให้มองเห็นชัดเจนบนพื้นหลังสว่าง  
* ใช้ตัวอักษรสีดำ (#000000) สำหรับหัวข้อและข้อมูลหลัก

Thai Localization:  
* บังคับใช้ line-height และ padding เพื่อป้องกันสระไทยทับซ้อน

2. Rendering Strategy: Hybrid PPR
* Static Shell: Navigation และ Branding (ใช้โลโก้ที่ public/images/logo.png).
* Dynamic Islands: ข้อมูล Real-time เชื่อมต่อกับ Supabase.

3. Database & Security Architecture (R0 Data Integrity)
Database: Supabase PostgreSQL
Schema Design: profiles, shifts, service_records, inventory_items.
Data Sanitation: ระบบตัวเลขต้องไม่มีเลข 0 นำหน้าเพื่อป้องกันความผิดพลาดทางตรรกะ.  
Safe Deletion & Optimistic UI: การลบข้อมูล (Delete) ต้องทำการลบ Child Records ทั้งหมดก่อนเสมอ (เช่น shifts ก่อน profiles) เพื่อป้องกัน Foreign Key Error การอัปเดตสถานะ UI ต้องทำแบบทันทีผ่าน `.filter()` และไม่ต้องพึ่งพา Browser Refresh

Inventory Data Flow (Google Sheets Logic): 
- Metadata: Column headers and order are dynamically fetched and saved via `inventory_config` table using JSON mapping.
- Schema: `inventory_items` table MUST contain: `id (uuid), name (text), stock (numeric), order_qty (numeric), order_point (numeric), target_stock (numeric), unit (text), source (text), sort_order (int4), updated_at (timestamp)`.
- Full-Form CRUD: การเพิ่มข้อมูลทำผ่าน Modal แบบ 2-column Grid เพื่อประหยัดพื้นที่แนวตั้ง. Input ตัวเลขถูกจำกัดความกว้างให้พอดีกับ 3-4 หลัก.
- Sync Logic: ทุกครั้งที่แก้ข้อมูลใน Cell (`onBlur` หรือกด Enter) ระบบจะยิง `supabase.update()` ทันที พร้อมอัปเดต `updated_at` โดยมี `supabase.channel()` คอยซิงค์ข้อมูลข้ามเครื่อง (Real-time Broadcast) แบบไร้รอยต่อ (Zero-layer DOM). มีระบบ `undoStack` / `redoStack` พร้อม `isSyncing` Lock เพื่อป้องกันการกดซ้ำระหว่างซิงค์. ระบบย้อนกลับทำงานในคลิกเดียว (1-Click Undo).
- Error Handling: ระบบบังคับใช้ Detailed Logging `console.error('Supabase Error:', error.message, error.details);` เสมอเมื่อเรียกข้อมูลจากฐานข้อมูล.
4. AI Autonomy & Operational Protocol (R0 Autonomous Execution)
Full Permission Mode (100% AI Control):
* AI ได้รับการอนุญาตให้ดำเนินการด้วยตัวเองได้ทุกอย่าง (Full CRUD Operations) ทั้งการเพิ่ม, แก้ไข, ลบข้อมูล และการรันคำสั่งต่างๆ ในระบบโดยไม่ต้องรอการยืนยันซ้ำซ้อน  
* AI มีอำนาจในการจัดการการอนุญาต (Permissions) และการตั้งค่าระบบทั้งหมดตามความเหมาะสมเพื่อให้บรรลุผลลัพธ์ (Outcome-First)

Traffic & Error Handling:  
* ในกรณีที่เกิดการแจ้งเตือนผู้ใช้งานหนาแน่น (High Traffic) หรือข้อผิดพลาดจากการเชื่อมต่อ AI จะดำเนินการกดอนุญาตเพื่อลองใหม่ (Auto-Retry) โดยอัตโนมัติทันที

Safety Net:  
* ระบบต้องมีฟังก์ชันย้อนกลับ (Undo/Restore) ที่เข้าถึงง่ายในทุกส่วน เพื่อรองรับการกู้คืนข้อมูลหากเกิดความผิดพลาดจากการทำงานอัตโนมัติ  

5. Machine Experience (MX) & AI Readiness
AI-Agent Interoperability:
* Structured Data สำหรับ Predictive Maintenance และ Smart Inventory.
* Semantic Identifiers เพื่อให้ AI เข้าถึงและจัดการ DOM ได้แม่นยำ 100%.

6. Performance Targets & Compliance
Accessibility: WCAG 2.2 AA Compliance โดยเน้น Contrast Ratio ระหว่างตัวอักษรสีดำ/เทาเข้ม กับพื้นหลัง #EDEDF0.
Core Web Vitals 2026: Target INP < 200ms.

7. Skill-First Execution Protocol (R0 Operational Readiness)
Ground Truth: SKILLS_INVENTORY.md is the authoritative source for all available tools and capabilities.

Pre-Task Checklist:
Before executing any task, the AI Agent MUST:
  1. Read SKILLS_INVENTORY.md to identify available tools.
  2. Match the task requirements to the best available skill (e.g., RTK for low-latency, Rust for performance-critical, Supabase for data).
  3. Classify the task risk level (R0/R1/R2) per Section 5 of ai-capabilities.md.
  4. Select the execution path with the highest stability score.
  5. Run Token Awareness Check via `python .antigravity/tools/monitor/check-budget.py` before executing major audits.

Skill Resolution Order:
  Priority 1: Project-local skills (.agents/skills/) — Gemini API, Google Cloud WAF.
  Priority 2: System-level tools (Cargo binaries) — RTK, Rust toolchain, jcode.
  Priority 3: Runtime capabilities (npm/Node.js, Python) — Next.js, Supabase.
  Priority 4: External integrations (Vercel CLI, Cloud services).

8. Extended Tooling & Reference Standards [V2]

Workflow (Mandatory Execution Order):
  Every task MUST follow this sequence before delivering output:

  Step 1 — CODE CONTEXT PREP (jcode):
    Run: python .antigravity/tools/memory-engine/aider/aider/repomap.py .
    Purpose: Generate PROJECT_MAP.md to understand full repo structure.
    Condition: Mandatory before any System Audit, Refactor, or Architecture task.
    Tool path: .antigravity/tools/jcode (Cargo/Rust) + RepoMap (Python stdlib)

  Step 2 — EXECUTION:
    Perform the requested task using the appropriate skill from SKILLS_INVENTORY.md.
    Apply R0/R1/R2 risk classification. Log all actions in ai-capabilities.md.

  Step 3 — DESIGN VALIDATION (design-md):
    Before delivering any .md output, validate structure and layout against:
      .antigravity/references/design-md/design-md/
    Recommended reference brands for BLACK-AND-BREW (minimalist/fintech aesthetic):
      - linear.app/   → clean information density
      - vercel/       → monochrome minimal documentation
      - stripe/       → structured data tables and precision copy
      - supabase/     → technical clarity with soft color accents
      - notion/       → readable hierarchy and whitespace usage
    Condition: Mandatory for all new .md files and documentation output.

Audit Protocol:
  When a "System Audit" is requested, the AI Agent MUST first invoke tools within
  `.antigravity/tools/jcode` to prepare comprehensive system context before proceeding.

Documentation Standard:
  All new or updated `.md` files MUST follow the structural and aesthetic standards
  defined in `.antigravity/references/design-md`. This ensures consistent,
  high-fidelity documentation across the project.

Outcome-First Delivery:
  Every output must be validated for correctness before being presented.
  Symmetry of information (input intent = output result) is non-negotiable.

Logging Requirement:
  All skill-based executions must be logged in ai-capabilities.md under "Autonomous Execution Logs" for auditability.


9. Memory & Context Management System (R0 Continuity)
Location: .antigravity/tools/memory-engine/

  Tool Stack:
  ┌─────────────────┬──────────────────────────────────────────────────────────────┐
  │ Tool             │ Role                                                         │
  ├─────────────────┼──────────────────────────────────────────────────────────────┤
  │ Mem0             │ Long-term memory layer. Stores user preferences, decisions,  │
  │                 │ and architectural choices in local DB (SQLite + vector store) │
  ├─────────────────┼──────────────────────────────────────────────────────────────┤
  │ aider/RepoMap   │ Generates a compact codebase map before every Audit task.    │
  │                 │ Mandatory to reduce token consumption by ~60-80%.             │
  ├─────────────────┼──────────────────────────────────────────────────────────────┤
  │ GraphRAG        │ Deep context extraction via knowledge graph for analysis of  │
  │                 │ private/unstructured data. Optional — high LLM cost.         │
  └─────────────────┴──────────────────────────────────────────────────────────────┘

  Mandatory Protocols:
  - REPOMAP FIRST: Before ANY audit task, generate RepoMap via:
      python .antigravity/tools/memory-engine/aider/aider/repomap.py .
    This produces a token-efficient codebase summary before analysis begins.

  - MEM0 LOGGING: After any user preference or key decision is confirmed, store it:
      python -c "from mem0 import Memory; m=Memory(); m.add('<decision>', user_id='blackandbrew-agent')"

  Platform Notes (Windows UCRT64/Python 3.14.3):
  - pip installed via: pacman -S mingw-w64-ucrt-x86_64-python-pip
  - mem0ai installed (no-deps): python -m pip install mem0ai --break-system-packages
  - Runtime deps installed: httpx, pydantic, qdrant-client
  - aider: available as source in .antigravity/tools/memory-engine/aider/
  - GraphRAG: available as source (requires Azure OpenAI key for indexing — deferred)

  Available Memory Commands:
  ┌───────────────────────────────────────────────────┬──────────────────────────┐
  │ COMMAND                                           │ PURPOSE                  │
  ├───────────────────────────────────────────────────┼──────────────────────────┤
  │ python -c "from mem0 import Memory; m=Memory();   │ Add a memory entry       │
  │   m.add('<text>', user_id='blackandbrew-agent')"  │                          │
  ├───────────────────────────────────────────────────┼──────────────────────────┤
  │ python -c "from mem0 import Memory; m=Memory();   │ Search memories          │
  │   print(m.search('<query>',                      │                          │
  │   user_id='blackandbrew-agent'))"                 │                          │
  ├───────────────────────────────────────────────────┼──────────────────────────┤
  │ python -c "from mem0 import Memory; m=Memory();   │ View ALL memories        │
  │   print(m.get_all(user_id='blackandbrew-agent'))" │ (full session recall)    │
  ├───────────────────────────────────────────────────┼──────────────────────────┤
  │ python .antigravity/tools/memory-engine/          │ Generate RepoMap for     │
  │   aider/aider/repomap.py .                        │ current project          │
  └───────────────────────────────────────────────────┴──────────────────────────┘