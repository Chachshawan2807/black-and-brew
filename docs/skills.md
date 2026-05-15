# Skills & Technical Capabilities — BLACKANDBREW ERP

> **Version:** 3.1 | **Last Updated:** 2026-05-16 | **Status:** RTK & Master Blueprint Compliant

เอกสารนี้รวบรวม "ความสามารถเชิงเทคนิค (Skills)" ทั้งหมดที่ถูก **Implement และใช้งานจริงแล้วใน Codebase** โดยอ้างอิงจาก Source Code จริง 100% (ปราศจากการ Hallucination) ตามมาตรฐาน Rebirth Tool Kit (RTK)

---

## 1. Database & API Layer

| Skill Name & Description | Technical Implementation | Location Reference |
| :--- | :--- | :--- |
| **Atomic Transactions**: บันทึกการเข้า-ออกสต็อกพร้อมๆ กันโดยไม่มีโอกาสเกิด Race Condition | ใช้ `supabase.rpc('record_inventory_transaction')` ระบุ `SECURITY DEFINER` และใช้ `FOR UPDATE` ทำ Row Lock ระดับ Database | `src/app/actions/inventory-actions.ts` / `fix_transaction_relationships.sql` |
| **Two-Step Fetch Strategy**: ดึงประวัติธุรกรรมข้ามข้อจำกัด RLS และป้องกัน Silent Failure จาก Foreign Key Joins | ดึง Transaction ตรงตาม `inventory_item_id` ก่อน นำ ID ที่ไม่ซ้ำไปดึง `inventory_items` แล้วนำมา Merge กันแบบ In-memory ใน Code | `src/app/actions/inventory-actions.ts` (`fetchTransactionHistory`) |
| **Zero-Cache Fetching**: บังคับให้ดึงข้อมูลล่าสุดจากฐานข้อมูลเสมอ ไม่พึ่งพา Next.js Cache | เรียกใช้ `unstable_noStore()` ในบรรทัดแรกของ Server Actions | `src/app/actions/inventory-actions.ts` |
| **Service Role Privilege Escalation**: Bypass RLS Policy ในกรณีที่ต้องการเขียนข้อมูลระดับ Admin/System | ใช้งาน `SUPABASE_SERVICE_ROLE_KEY` ฝั่งเซิร์ฟเวอร์เท่านั้น ห้ามใส่ prefix `NEXT_PUBLIC_` เด็ดขาด | `src/app/actions/inventory-actions.ts` / `.env.local` |

---

## 2. UI/UX & Data Visualization

| Skill Name & Description | Technical Implementation | Location Reference |
| :--- | :--- | :--- |
| **Spreadsheet Inline Editing**: แก้ไขข้อมูลได้โดยตรงบนตารางเหมือน Google Sheets และเลื่อนช่องถัดไปด้วยปุ่ม Enter | ใช้ Native `<input>` ภายใน `<td>` จับ State ด้วย `onChange` และทริกเกอร์บันทึกด้วย `onBlur` หรือ `onKeyDown={Enter}` | `src/app/[locale]/inventory/page.tsx` (`EditableCell`) |
| **Drag-and-Drop Sorting**: จับลากสลับลำดับแถวได้อย่างอิสระ | ใช้ `@dnd-kit/core` ร่วมกับ `SortableContext` และบังคับ `PointerSensor` ที่ distance: 5 เพื่อป้องกันการเผลอลาก | `src/app/[locale]/inventory/page.tsx` (`SortableRow`) |
| **Optimistic UI Updates**: อัปเดตหน้าจอทันทีโดยไม่ต้องรอ DB ตอบสนอง เพื่อประสบการณ์ใช้งานที่ลื่นไหล | ใช้ Functional Update แบบทันที (`setItems(prev => ...)`) หาก Supabase update error ระบบจะสั่ง Rollback State คืนทันที | `src/app/[locale]/inventory/page.tsx` |
| **Dynamic Column Configuration**: เปลี่ยนชื่อคอลัมน์และลากปรับความกว้างได้ บันทึกค่าลงฐานข้อมูลอัตโนมัติ | ใช้งานตาราง `inventory_config` จัดเก็บ JSONB (Labels/Widths/Order) ควบคู่กับ Mouse Event Listener (onMouseMove) | `src/app/[locale]/inventory/page.tsx` (`ColumnHeader`) |
| **Aesthetic Lock (R0 Visuals)**: ดีไซน์ Minimalist ตามมาตรฐาน Morning Latte Cream | บังคับใช้ `font-normal`, ลบ `font-bold` ออกทั้งหมด, ทุก element ต้องใช้ `rounded-3xl` | `globals.css`, Component ทุกชิ้น |

---

## 3. Data Integrity & Business Logic

| Skill Name & Description | Technical Implementation | Location Reference |
| :--- | :--- | :--- |
| **Persistent Zero & Numeric Sanitization**: ปกป้องชนิดข้อมูล Numeric (เช่น ป้องกัน `""` ไปยัง DB) ตัด 0 นำหน้า และรักษาเลข 0 ของจริงไว้ | ใช้ String-First Input (`value === "" ? 0 : Number(value)`), Regex `replace(/^0+(?=\d)/, '')` | `src/app/[locale]/inventory/page.tsx` (`EditableCell`) / `MASTER_BLUEPRINT.md` (SPEC 3.1) |
| **Computed Auto-Ordering**: คำนวณจำนวนของที่ต้องสั่งโดยอัตโนมัติ เมื่อสต็อกต่ำกว่าจุดสั่งซื้อ | คำนวณผ่าน React State: หาก `stock <= order_point` ค่าของ `order_qty = target_stock - stock` (Field ใน UI จะเป็น readOnly) | `src/app/[locale]/inventory/page.tsx` |
| **1-Click Undo/Redo Engine**: ย้อนกลับการกระทำ พร้อมซิงค์ฐานข้อมูลกลับทันที | สร้าง State Custom `undoStack` และ `redoStack` และทำ Full DB Sync เมื่อมีการ Undo/Redo พร้อมใส่ `isSyncing` ล็อก | `src/app/[locale]/inventory/page.tsx` |

---

## 4. AI Agent & Context Skills

| Skill Name & Description | Technical Implementation | Location Reference |
| :--- | :--- | :--- |
| **RTK (Rebirth Tool Kit / Protocol)**: ระบบจัดการบริบทและการทำงานของ AI ให้มีความแม่นยำสูงสุด ประหยัด Token และรักษามาตรฐานระบบ | **Context Bootstrapping**: บังคับอ่าน `.md` ทั้งหมดก่อนเริ่มงาน / **Token Efficiency**: ใช้ RepoMap เพื่อลดการอ่านไฟล์ขยะ / **Naming Enforcement**: บังคับใช้ `inventory_item_id` ตาม `rules.md` | `docs/agent.md` / `docs/rules.md` / `MASTER_BLUEPRINT.md` |
| **Agent Filesystem Tool**: สิทธิ์ให้ Agent สร้าง, อ่าน, และแก้ไขไฟล์ในโปรเจกต์ได้อย่างเป็นระบบ | ใช้ Node.js `fs/promises` พร้อม Schema Validation ผ่าน `Zod` (ตรวจสอบ string, type อย่างเคร่งครัด) | `src/lib/agent-tools/fs_tool.ts` |
| **Agent Shell Tool**: สิทธิ์ให้ Agent สั่งรัน Terminal Commands แบบปลอดภัย | ใช้ Node.js `child_process.exec` หุ้มด้วย Promise | `src/lib/agent-tools/shell_tool.ts` |
| **Codebase Search Proxy**: เครื่องมือค้นหา Logic ภายในโปรเจกต์ เพื่อป้องกัน Agent แก้โค้ดผิดที่ | รันคำสั่ง grep หรือ search engine ภายในโฟลเดอร์ | `src/lib/agent-tools/search_proxy.ts` |
| **Memory & Context Engine (Mem0)**: ระบบจำ Decision Log และ Architecture (ระยะยาว) ของโปรเจกต์ | รันสคริปต์ Python `mem0ai` ฝังข้อมูลลง SQLite/Vector DB ป้องกัน AI ลืมบริบทงานข้ามวัน (ตาม Blueprint) | `.antigravity/tools/memory-engine/` (Reference) |
| **RepoMap Generation**: สร้างแผนที่ไฟล์โปรเจกต์ย่อๆ (Precision Strike) ลดการอ่านไฟล์ขยะ ลด Token | รันคำสั่ง `aider/repomap.py` ก่อนเริ่มแก้ไฟล์ทุกครั้ง | `MASTER_BLUEPRINT.md` (Combo Matrix) |
