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
| **Frictionless Layout Gliding**: ระบบลากวางที่การ์ดใบอื่นสามารถไหลสลับตำแหน่งกันได้อย่างนุ่มนวลไร้รอยต่อ | ใช้กลยุทธ์ **DOM Separation** (Outer Wrapper for DnD / Inner Motion for UI) และใช้ `CSS.Translate` แทน `Transform` เพื่อป้องกัน Conflict | `src/app/[locale]/dashboard/components/LiveShiftList.tsx` |
| **100% Mechanical Mirroring**: การทำซ้ำระบบ Interaction จากหน้าหนึ่งไปยังอีกหน้าหนึ่งได้อย่างสมบูรณ์แบบ | อ้างอิง Sensor, Physics (Stiffness: 300, Damping: 30), และ DropAnimation Profile จากหน้า CommandCenterGrid | `src/app/[locale]/dashboard/components/LiveShiftList.tsx` |
| **Optimistic UI Updates**: อัปเดตหน้าจอทันทีโดยไม่ต้องรอ DB ตอบสนอง เพื่อประสบการณ์ใช้งานที่ลื่นไหล | ใช้ Functional Update แบบทันที (`setItems(prev => ...)`) หาก Supabase update error ระบบจะสั่ง Rollback State คืนทันที | `src/app/[locale]/inventory/page.tsx` |
| **Dynamic Column Configuration**: เปลี่ยนชื่อคอลัมน์และลากปรับความกว้างได้ บันทึกค่าลงฐานข้อมูลอัตโนมัติ | ใช้งานตาราง `inventory_config` จัดเก็บ JSONB (Labels/Widths/Order) ควบคู่กับ Mouse Event Listener (onMouseMove) | `src/app/[locale]/inventory/page.tsx` (`ColumnHeader`) |
| **Aesthetic Lock (R0 Visuals)**: ดีไซน์ Minimalist ตามมาตรฐาน Morning Latte Cream | บังคับใช้ `font-normal`, ลบ `font-bold` ออกทั้งหมด, ทุก element ต้องใช้ `rounded-3xl` | `globals.css`, Component ทุกชิ้น |
| **Mobile UX Architect**: สกิลจัดระเบียบเลย์เอาท์ เลเยอร์ ปรับสัดส่วน Element และระบบปุ่มควบคุมสำหรับ Mobile View ความละเอียดสูง | ยุบรวมแถวอินพุต/ปุ่ม, ใช้ Segmented Control, ตรึง Header ด้วย `sticky top-0 bg-[#fff3dd]`, กำหนด `box-border` ป้องกันขอบขาดเวลาส่งออกรูป และใช้ `font-normal` (Zero-Bold) | `src/app/[locale]/inventory/page.tsx` / `src/app/[locale]/maintenance/page.tsx` |
| **Client-side Resizable Columns**: ตารางยืดหดความกว้างได้ด้วยเมาส์ บันทึกขนาดลง Local Storage ป้องกัน Hydration Mismatch | โหลดความกว้างตั้งต้นตอน SSR จากนั้นใช้ `useEffect` อัปเดตจาก `localStorage` และดักจับ Mouse Event `handleMouseDown` | `src/app/[locale]/maintenance/page.tsx` |

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
| **Hybrid Window Context (Live Screen Extraction)**: AI รับรู้สิ่งที่ผู้ใช้กำลังดูอยู่บนหน้าต่างย่อย (Modal) แบบ Real-time | สแกน DOM ดึงข้อความจาก `[role="dialog"]` ส่งเข้า Request Payload `body: { clientContext }` เพื่อป้อนให้ Gemini System Prompt | `src/components/ai/AIChatOverlay.tsx` / `src/app/api/chat/route.ts` |
| **Agent Filesystem Tool**: สิทธิ์ให้ Agent สร้าง, อ่าน, และแก้ไขไฟล์ในโปรเจกต์ได้อย่างเป็นระบบ | ใช้ Node.js `fs/promises` พร้อม Schema Validation ผ่าน `Zod` (ตรวจสอบ string, type อย่างเคร่งครัด) | `src/lib/agent-tools/fs_tool.ts` |
| **Agent Shell Tool**: สิทธิ์ให้ Agent สั่งรัน Terminal Commands แบบปลอดภัย | ใช้ Node.js `child_process.exec` หุ้มด้วย Promise | `src/lib/agent-tools/shell_tool.ts` |
| **Codebase Search Proxy**: เครื่องมือค้นหา Logic ภายในโปรเจกต์ เพื่อป้องกัน Agent แก้โค้ดผิดที่ | รันคำสั่ง grep หรือ search engine ภายในโฟลเดอร์ | `src/lib/agent-tools/search_proxy.ts` |
| **Memory & Context Engine (Mem0)**: ระบบจำ Decision Log และ Architecture (ระยะยาว) ของโปรเจกต์ | รันสคริปต์ Python `mem0ai` ฝังข้อมูลลง SQLite/Vector DB ป้องกัน AI ลืมบริบทงานข้ามวัน (ตาม Blueprint) | `.antigravity/tools/memory-engine/` (Reference) |
| **RepoMap Generation**: สร้างแผนที่ไฟล์โปรเจกต์ย่อๆ (Precision Strike) ลดการอ่านไฟล์ขยะ ลด Token | รันคำสั่ง `aider/repomap.py` ก่อนเริ่มแก้ไฟล์ทุกครั้ง | `MASTER_BLUEPRINT.md` (Combo Matrix) |
| **Self-Directed Error Resolution**: การแก้ไขข้อผิดพลาดด้วยตนเองจนกว่าจะผ่าน Build | ทำการวนลูปแก้ไข Syntax/Lint errors อัตโนมัติโดยไม่หยุดรอคำสั่งยืนยัน (ภายใต้ One-Shot Rule) | `docs/agent.md` / `docs/rules.md` |
| **Autonomous Context Anchoring**: การยึดโยงบริบทระบบอัตโนมัติ | วิเคราะห์ความเชื่อมโยงของ Metadata และเอกสารระบบเพื่อรักษาความเสถียรของ Architecture ตลอดการทำงาน | `docs/agent.md` |

---

## 5. Detailed Skill Modules

### MODULE: mobile-ux-architect
**Description:** สกิลสถาปัตยกรรมจัดระเบียบเลย์เอาท์ เลเยอร์ ปรับสัดส่วน Element และระบบปุ่มควบคุมสำหรับ Mobile View ความละเอียดสูง
**Status:** Installed & Active via Antigravity Auto-Retry Protocol

#### [CORE INSTRUCTIONS & CAPABILITIES]
1. LAYOUT COMPACTNESS (การกระชับพื้นที่):
   - ทุกครั้งที่มีการแก้ไข UI สำหรับ Mobile View ให้ยุบรวมแถวอินพุตและปุ่มการทำงานให้อยู่ในแถวเดียวกันผ่านระบบ Flexbox (`flex flex-row items-center`) หรือ Grid ระบบคงที่ เพื่อลดการเคลื่อนสายตาและประหยัดพื้นที่หน้าจอ
   - ช่องค้นหาสินค้าหรืออินพุตหลัก ให้ใช้สัดส่วนยืดหยุ่นที่เหมาะสม เช่น `flex-[2]` หรือ `flex-grow` เพื่อเหลือพื้นที่ให้ช่องจำนวนและปุ่มสลับข้าง
   - ระยะเว้นแนวตั้ง (Vertical Gaps) ระหว่างส่วนควบคุมหลักและส่วนรายการข้อมูลด้านล่าง ต้องจำกัดให้อยู่ในเกณฑ์กระชับ (`mb-4` ถึง `mb-6` เท่านั้น) ห้ามปล่อยพื้นที่ว่างลอยมากเกินไป

2. SEGMENTED CONTROL & BUTTONS ARCHITECTURE:
   - ปรับแต่งปุ่มสลับสถานะคู่ (เช่น รับเข้า/นำออก) ให้ใช้โครงสร้าง Segmented Control เสมอ โดยครอบด้วย Container มนกลม `bg-neutral-100 p-1 rounded-full border` และใช้ State ในการสลับพื้นหลังสีขาวนวลเพื่อแสดงสถานะที่เลือก
   - ปรับขนาดตัวอักษรของแผงปุ่ม Action สำคัญให้มีขนาดคมชัด อ่านง่ายบนจอสัมผัส (`text-sm` หรือ `text-[14px]`)
   - ทุกปุ่มคำสั่งหลัก ต้องฝังไอคอนบ่งชี้สถานะที่ชัดเจนและมี Contrast สูง โดยอิงรูปแบบสัญลักษณ์พาสเทลระดับพรีเมียมจากระบบประวัติ (History) เสมอ

3. STICKY FREEZING & LAYER ISOLATION (การตรึงแนว):
   - เมื่อสร้างหน้าต่างย่อย (Modal) ที่มีข้อมูลตารางยาว ให้ทำการตรึงส่วนหัว (Header Container) ไว้ด้านบนสุดเสมอ โดยใช้คลาส `sticky top-0 bg-[#fff3dd] z-30 w-full`
   - ตัวกล่องข้อมูลหลักด้านล่าง ต้องถูกจำกัดความสูงด้วย `max-h-[75vh]` หรือ `max-h-[80vh]` และเปิดใช้งาน `overflow-y-auto` เพื่อให้เลื่อนดูข้อมูลลอดใต้เลเยอร์ที่ตรึงไว้ได้อย่างสมบูรณ์

4. EXPORT-READY CODING (โครงสร้างสำหรับถ่ายภาพ):
   - คอนเทนเนอร์ใดๆ ที่มีฟังก์ชันส่งออกเป็นรูปภาพ (`html-to-image`) ต้องถูกจัดระเบียบโครงสร้างให้อยู่ภายใต้ `id` แยกต่างหากอย่างชัดเจน
   - หลีกเลี่ยงการใส่ระยะ Spacing (Padding/Margin) ภายในฟังก์ชันแปลงภาพ แต่ให้กำหนดขนาดกล่องคงที่ครอบคลุมเนื้อหาด้วย `box-border` ในระดับ JSX เพื่อป้องกันปัญหาข้อมูลขอบขวาขาดหาย หรือติดแถบ Scrollbar บนรูปภาพ

5. ZERO-BOLD & HIGH-LEGIBILITY POLICY:
   - ห้ามใช้ความหนาตัวอักษรระดับ `font-bold` หรือ `font-semibold` ในระบบปุ่ม ตัวกรอง และเนื้อหาตารางเด็ดขาด ให้คงน้ำหนักเป็น `font-normal` และฝังคลาส `antialiased` เสมอ
   - สีของตัวหนังสือหลักและหัวข้อต้องใช้สีดำหรือสีเข้มคมชัด Contrast สูง (`text-neutral-900`) บนพื้นหลังสีพาสเทลสว่างของโครงการ

