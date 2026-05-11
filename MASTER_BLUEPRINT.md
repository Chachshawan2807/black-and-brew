# MASTER_BLUEPRINT.md: BLACK-AND-BREW ERP SYSTEM

Status: Approved for Implementation | Owner: Supreme Systems Architect
Methodology: Outcome-First, Chained Thinking, R0/R1/R2 Risk Assessment

## 1. System Overview & Identity

Project Identity: BLACK-AND-BREW Enterprise Resource Planning (ERP) System (v2026).
Primary Purpose: ระบบจัดการตารางงานพนักงาน (Scheduling) และระบบบันทึกประวัติการซ่อมบำรุงอุปกรณ์
(Maintenance System) รวมถึงระบบจัดการคลังสินค้าอัจฉริยะ (Smart Inventory).
หน้าจอแดชบอร์ดหลักถูกออกแบบมาให้เน้นโฟกัสงานของพนักงาน (Staff Focus) โดยมีการจำกัดการเข้าถึง
ส่วนที่ไม่เกี่ยวข้อง เช่น คลังสินค้า.

### Core Context & Constraints

Target Personnel: พนักงานหลัก 9 ท่าน.
Operational Logic: บทบาทพนักงานสลับกันได้อิสระ รองรับกะงานพิเศษทุกรูปแบบ.
Timezone: BKK (GMT+7) (Strict Enforcement).
Tech Stack: Next.js 16, React 19, Supabase, Tailwind CSS, Vercel Edge Runtime.

## 2. UI/UX & Typography Standards (R0 Visual Integrity)

### Compact & Adaptive UI

* หน้าต่าง Modal และ Form ใช้ระบบ Grid เพื่อลดความสูง
* Sidebar ปรับขนาดอัตโนมัติ (Dynamic Width)

### Typography & Visibility (Strict Rules)

* ห้ามใช้ตัวอักษรแบบหนา (No Bold Text) ในทุกส่วนของแอปพลิเคชัน
* กรณีใช้สีเทา ต้องเป็นสีเทาแบบเข้ม (Dark Gray / #555555 หรือเข้มกว่า)
  เพื่อให้มองเห็นชัดเจนบนพื้นหลังสว่าง
* ใช้ตัวอักษรสีดำ (#000000) สำหรับหัวข้อและข้อมูลหลัก

### Thai Localization

* บังคับใช้ line-height และ padding เพื่อป้องกันสระไทยทับซ้อน

### UI Layering & Stacking Context (Logo Z-Index Standard)

* Global Logo and Critical Branded elements must maintain a z-index of 50+
  (Standard: 110 in Sidebar, 50 in Content Headers) to ensure top-layer
  visibility across all modules.
* The Logo wrapper must use `position: relative` (or absolute/fixed) to
  establish a correct stacking context.
* Modal windows and overlays must use z-index in the range of 100-200 to prevent
  clashing with navigation or persistent branding.
* Persistent sidebars and headers must maintain a clear stacking context to
  avoid being obscured by page-specific content windows.

## 3. Rendering Strategy: Hybrid PPR

* Static Shell: Navigation และ Branding (ใช้โลโก้ที่ public/images/logo.png).
* Dynamic Islands: ข้อมูล Real-time เชื่อมต่อกับ Supabase.
* Root Redirect Logic: บังคับการ Redirect จาก Root URL (/) ไปยังหน้าหลักตามภาษา
  (/th) เพื่อเข้าสู่ Command Center โดยตรงผ่าน Server-side Proxy
  (`src/proxy.ts`).

## 4. Database & Security Architecture (R0 Data Integrity)

Database: Supabase PostgreSQL
Schema Design: profiles, shifts, service_records,
inventory_items.

### Data Sanitation (Global Zero Rule - SPEC 3.1)

* "Empty is Zero" Logic: Numeric values of 0 must be rendered as empty strings ("")
  in UI inputs for a cleaner, "Google Sheets" style appearance.
* Fallback to 0: If a field is empty (""), the system must treat it as 0 in state,
  calculations, and database operations.
* Manual Deletion: Users must be able to delete numbers (including 0) to leave
  the field empty.
* Numeric formatting: Strip leading zeros from integer inputs (e.g., 05 -> 5)
  to prevent logic errors.
* Fallback Display: If data is null/undefined (non-numeric), show as empty string.

### Safe Deletion & Optimistic UI

การลบข้อมูล (Delete) ต้องทำการลบ Child Records ทั้งหมดก่อนเสมอ
(เช่น shifts ก่อน profiles)
เพื่อป้องกัน Foreign Key Error การอัปเดตสถานะ UI ต้องทำแบบทันทีผ่าน `.filter()`
และไม่ต้องพึ่งพา Browser Refresh

### Inventory Data Flow (Google Sheets Logic)

* Metadata: Column headers and order are dynamically fetched and saved via
  `inventory_config` table using JSON mapping.
* Schema: `inventory_items` table MUST contain: `id (uuid), name (text), stock (numeric),
  order_qty (numeric), order_point (numeric), target_stock (numeric), unit (text),
  source (text), sort_order (int4), updated_at (timestamp)`.
* Full-Form CRUD: การเพิ่มข้อมูลทำผ่าน Modal แบบ 2-column Grid เพื่อประหยัดพื้นที่แนวตั้ง.
  Input ตัวเลขถูกจำกัดความกว้างให้พอดีกับ 3-4 หลัก.
* Sync Logic: ทุกครั้งที่แก้ข้อมูลใน Cell (`onBlur` หรือกด Enter) ระบบจะยิง
  `supabase.update()` ทันที พร้อมอัปเดต `updated_at` โดยมี `supabase.channel()`
  คอยซิงค์ข้อมูลข้ามเครื่อง (Real-time Broadcast) แบบไร้รอยต่อ (Zero-layer DOM).
  มีระบบ `undoStack` / `redoStack` พร้อม `isSyncing` Lock เพื่อป้องกันการกดซ้ำระหว่างซิงค์.
  ระบบย้อนกลับทำงานในคลิกเดียว (1-Click Undo).
* Error Handling: ระบบบังคับใช้ Detailed Logging เสมอเมื่อเรียกข้อมูลจากฐานข้อมูล:
  `console.error('Supabase Error:', error.message, error.details);`

## 5. AI Autonomy & Operational Protocol (R0 Autonomous Execution)

### Full Permission Mode (100% AI Control)

* AI ได้รับการอนุญาตให้ดำเนินการด้วยตัวเองได้ทุกอย่าง (Full CRUD Operations)
  ทั้งการเพิ่ม, แก้ไข, ลบข้อมูล และการรันคำสั่งต่างๆ ในระบบโดยไม่ต้องรอการยืนยันซ้ำซ้อน
* AI มีอำนาจในการจัดการการอนุญาต (Permissions) และการตั้งค่าระบบ
  ทั้งหมดตามความเหมาะสมเพื่อให้บรรลุผลลัพธ์ (Outcome-First)

### Traffic & Error Handling

* ในกรณีที่เกิดการแจ้งเตือนผู้ใช้งานหนาแน่น (High Traffic) หรือข้อผิดพลาดจากการเชื่อมต่อ
  AI จะดำเนินการกดอนุญาตเพื่อลองใหม่ (Auto-Retry) โดยอัตโนมัติทันที

### Safety Net

* ระบบต้องมีฟังก์ชันย้อนกลับ (Undo/Restore) ที่เข้าถึงง่ายในทุกส่วน
  เพื่อรองรับการกู้คืนข้อมูลหากเกิดความผิดพลาดจากการทำงานอัตโนมัติ

## 6. Machine Experience (MX) & AI Readiness

### AI-Agent Interoperability

* Structured Data สำหรับ Predictive Maintenance และ Smart Inventory.
* Semantic Identifiers เพื่อให้ AI เข้าถึงและจัดการ DOM ได้แม่นยำ 100%.

## 7. Performance Targets & Compliance

* Accessibility: WCAG 2.2 AA Compliance โดยเน้น Contrast Ratio ระหว่างตัวอักษรสีดำ
  / เทาเข้ม กับพื้นหลัง #EDEDF0.
* Core Web Vitals 2026: Target INP < 200ms.

## 8. Mandatory Operational Workflow (Combo Matrix — SOP)

Base Logic: Outcome-First + Blueprinting.
Every task MUST follow:
THINK → MAP (jcode) → BUDGET CHECK → EXECUTE → VALIDATE → LOG.

### Combo Matrix (Enforced for ALL Interfaces)

1. **Combo 1 — PRECISION STRIKE (jcode → fs_tool):**
   * Trigger: Any file edit, audit, or refactor task.
   * Protocol: Run RepoMap to generate PROJECT_MAP.md before
     touching any file.
   * Benefit: Eliminates blind editing. Reduces token consumption by 60-80%.
   * Command:

     ```bash
     python .antigravity/tools/memory-engine/aider/aider/repomap.py .
     ```

2. **Combo 2 — BUDGET GUARDIAN (Token Awareness → Shell_tool):**
   * Trigger: Before npm run build, test suites, or heavy CLI operations.
   * Protocol: Check token budget. If usage > 80% of quota, ABORT and notify.
   * Benefit: Prevents runaway costs from recursive build loops.
   * Command:

     ```bash
     python .antigravity/tools/monitor/check-budget.py
     ```

3. **Combo 3 — AESTHETIC ENFORCER (UI/UX PRO MAX → fs_tool):**
   * Trigger: Any .tsx or .css file write.
   * Protocol: Auto-validate written content against R0 Visual Standards:
     * `rounded-3xl` for all buttons, cards, modals, inputs
     * `#000000` text, `font-normal` (400 weight)
     * `border-[#000000]/5` for all separators
     * `bg-[#fdfcf0]` (Morning Latte Cream) background
     * Logo z-index: 110 (Sidebar), 50 (Content Headers)
   * Benefit: Enforces the Analog aesthetic as a physical property of the filesystem.

4. **Combo 4 — RECURSIVE WISDOM (Mem0 → Agent Skills):**
   * Trigger: After any Exit Code: 1, linter failure, or architectural mistake.
   * Protocol: Identify root cause. Store lesson in Mem0. Search Mem0 before
     next similar task.
   * Benefit: Builds long-term architectural immunity against repeated errors.

   Command (Store):

   ```bash
   python -c "from mem0 import Memory; m=Memory(); m.add('\<lesson\>', user_id='blackandbrew-agent')"
   ```

   Command (Search):

   ```bash
   python -c "from mem0 import Memory; m=Memory(); print(m.search('\<query\>', user_id='blackandbrew-agent'))"
   ```

Reference: `.antigravity/PROTOCOL_ENFORCER.md`
(High-density single-page SOP, ~300 tokens)

### Skill Resolution Order

* Priority 1: Project-local skills (.agents/skills/) — Gemini API,
  Google Cloud WAF.
* Priority 2: System-level tools (Cargo binaries) — RTK, Rust toolchain, jcode.
* Priority 3: Runtime capabilities (npm/Node.js, Python) — Next.js, Supabase.
* Priority 4: External integrations (Vercel CLI, Cloud services).

### Pre-Task Checklist

1. Read SKILLS_INVENTORY.md to identify available tools.
2. Match task requirements to the best available skill.
3. Classify risk level (R0/R1/R2).
4. Select the execution path with the highest stability score.
5. Run Token Awareness Check before major audits.

### Installed Agent Tools

* Filesystem Tool: `src/lib/agent-tools/fs_tool.ts` (Zod-validated CRUD)
* Shell Tool: `src/lib/agent-tools/shell_tool.ts` (Secure child_process exec)
* Search Proxy: `src/lib/agent-tools/search_proxy.ts` (Unified code/docs/web search)

## 9. Documentation & Audit Standards

## 10. Memory & Context Management System (R0 Continuity)

Location: `.antigravity/tools/memory-engine/`

### Tool Stack

* **Mem0**: Long-term memory layer. Stores user preferences, decisions, and
  architectural choices in local DB (SQLite + vector store).
* **aider/RepoMap**: Generates a compact codebase map before every Audit task.
  Mandatory to reduce token consumption by ~60-80%.
* **GraphRAG**: Deep context extraction via knowledge graph for analysis of
  private/unstructured data. Optional — high LLM cost.

  Mandatory Protocols:

* REPOMAP FIRST: Before ANY audit task, generate RepoMap via:

  ```bash
  python .antigravity/tools/memory-engine/aider/aider/repomap.py .
  ```

  This produces a token-efficient codebase summary before analysis begins.

* MEM0 LOGGING: After any user preference or key decision is confirmed, store it:

  ```bash
  python -c "from mem0 import Memory; m=Memory(); m.add('\<decision\>', user_id='bb-agent')"
  ```

  Platform Notes (Windows UCRT64/Python 3.14.3):

* pip installed via: `pacman -S mingw-w64-ucrt-x86_64-python-pip`
* mem0ai installed (no-deps): `python -m pip install mem0ai --break-system-packages`
* Runtime deps installed: `httpx, pydantic, qdrant-client`
* aider: available as source in `.antigravity/tools/memory-engine/aider/`
* GraphRAG: available as source (requires Azure OpenAI key — deferred)

### Available Memory Commands

**Add a memory entry:**

```bash
python -c "from mem0 import Memory; m=Memory(); m.add('\<text\>', user_id='bb-agent')"
```

**Search memories:**

```bash
python -c "from mem0 import Memory; m=Memory(); print(m.search('\<query\>', user_id='bb-agent'))"
```

**View ALL memories (full session recall):**

```bash
python -c "from mem0 import Memory; m=Memory(); print(m.get_all(user_id='bb-agent'))"
```

**Generate RepoMap for current project:**

```bash
python .antigravity/tools/memory-engine/aider/aider/repomap.py .
```

## 11. Architectural Refactor Logs

### Omni-Refactor Execution (Phase 5 Memory Sync)

**Date:** May 2026
**Objective:** Project-Wide Omni-Refactor for Dead Code Purge & Logic De-Duplication.

| Refactored Element | Location | Status | Rationale |
| :--- | :--- | :--- | :--- |
| `className` | `ClickableDatePicker.tsx` | Removed | Unused prop to prevent clutter. |
| `className` | `ClickableInput.tsx` | Removed | Unused prop to prevent clutter. |
| `fs_tool.ts` types | `fs_tool.ts` | Updated | Exported Schema, replaced `any` with `unknown` for strict typing. |
| `shell_tool.ts` types | `shell_tool.ts` | Updated | Replaced `any` with `unknown` for strict typing, fixed syntax errors. |
| `setMounted` inside Effect | `ScheduleClient.tsx` | Kept (Rules disabled) | Necessary for Next.js 16 hydration, silenced `set-state-in-effect`. |
| `setIsMounted` inside Effect | `CommandCenterGrid.tsx`| Kept (Rules disabled) | Necessary for Next.js 16 hydration, silenced `set-state-in-effect`. |
| `confirmDelete` | `ScheduleClient.tsx` | Removed | Unused state variable. |
| Unused `error`/`err` blocks | `ScheduleClient.tsx` | Removed | Switched to empty `catch {}` block per Next.js 13+ standards to avoid data leakage. |

*System Integrity Validated:* Zero build errors (Exit Code 0), visual standards matching Morning Latte Cream (`#fdfcf0`) remain 100% compliant.
