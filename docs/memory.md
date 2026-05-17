# Memory Log — BLACKANDBREW ERP

> **Purpose:** บันทึกการตัดสินใจเชิงสถาปัตยกรรมที่สำคัญ เพื่อป้องกันการทำผิดซ้ำ

---

## Decision Log

### DEC-003: Sub-label Typography Standard

- **Date:** May 16, 2026
- **Context:** ฟอนต์ขนาด `text-[11px]` หรือเล็กกว่า อ่านยากบนหน้าจอพนักงาน (Mobile/Tablet)
- **Decision:** อัปเกรดหัวข้อย่อยและป้ายกำกับทั้งหมดเป็น **`text-sm` (14px)** หรือขั้นต่ำ **`text-[13px]`** โดยห้ามใช้ `font-bold` (Zero-Bold Policy)
- **Impact:** ต้องปรับลด Padding/Gap ใน Modals เพื่อล็อกความสูงให้จบในหน้าเดียว (One-Shot View)

### DEC-001: Column Rename `product_id` → `inventory_item_id`

- **Date:** May 2026
- **Context:** `inventory_transactions` table เดิมใช้คอลัมน์ `product_id` แต่ไม่สอดคล้องกับ naming convention ของตาราง `inventory_items`
- **Decision:** Rename column เป็น `inventory_item_id` ผ่าน migration script `fix_transaction_relationships.sql`
- **Impact:** Server Actions (`inventory-actions.ts`) ทั้งหมดต้องใช้ `inventory_item_id` เท่านั้น — **ห้ามเปลี่ยนกลับ**
- **Evidence:** `query.eq('inventory_item_id', itemId)` ใน `fetchTransactionHistory()`

### DEC-002: Two-Step Fetch Strategy for Transaction History

- **Date:** May 2026 (v3.1)
- **Context:** FK Join ระหว่าง `inventory_transactions` กับ `inventory_items` ถูก RLS บล็อกในบางกรณี ทำให้ data เป็น null แบบ silent
- **Decision:** ใช้ Two-Step Fetch — ดึง transactions ก่อน แล้วจึงดึงชื่อสินค้ามา merge ใน code
- **Impact:** ป้องกัน silent failure จาก RLS + FK join issues
- **Evidence:** `fetchTransactionHistory()` ใน `inventory-actions.ts` (Lines 49-128)

### DEC-003: Service Role Key for Server Actions

- **Date:** May 2026
- **Context:** Anon Key ถูก RLS จำกัดสิทธิ์ ทำให้ Server Actions ไม่สามารถเขียนข้อมูลได้ในบางกรณี
- **Decision:** ใช้ `SUPABASE_SERVICE_ROLE_KEY` ใน Server Actions เพื่อ bypass RLS
- **Impact:** Server Actions มีสิทธิ์สูงสุด; Key ต้องไม่มี `NEXT_PUBLIC_` prefix
- **Evidence:** `.env.local` line 6, `inventory-actions.ts` line 8

### DEC-004: Atomic Transactions via PostgreSQL RPC

- **Date:** May 2026
- **Context:** การ update stock + insert transaction แยกกันทำให้เกิด race condition
- **Decision:** สร้าง RPC function `record_inventory_transaction` ที่ทำทั้งสองอย่างในหนึ่ง transaction พร้อม row lock (`FOR UPDATE`)
- **Impact:** Zero race condition, Zero data mismatch
- **Evidence:** `setup_inventory_transactions.sql`, `fix_transaction_relationships.sql`

### DEC-005: Computed Order Quantity (Read-Only Field)

- **Date:** May 2026
- **Context:** `order_qty` เคยเป็น manual input ซึ่งพนักงานมักกรอกผิด
- **Decision:** เปลี่ยนเป็น Computed Field: `IF stock <= order_point THEN order_qty = target_stock - stock ELSE 0`
- **Impact:** `order_qty` column ใน UI เป็น `readOnly`; ค่าคำนวณใน `EditableCell` useEffect
- **Evidence:** `page.tsx` lines 204-209, `PROTOCOL_ENFORCER.md` Automated Ordering Standards

### DEC-006: No Bold Text (R0 Visual Standard)

- **Date:** May 2026
- **Context:** ตัวหนาทำให้ UI ดูรก และไม่สอดคล้องกับ Minimalist Analog aesthetic
- **Decision:** ห้ามใช้ `font-bold`, `font-semibold`, `font-black` ทั่วทั้งแอปพลิเคชัน
- **Impact:** ทุกไฟล์ `.tsx` ใช้ `font-normal` เท่านั้น
- **Evidence:** `MASTER_BLUEPRINT.md` Section 2, verified via Omni-Refactor Logs

### DEC-007: Undo/Redo Bypasses Financial Transactions

- **Date:** May 2026
- **Context:** การ Undo stock transactions ทำให้ ledger ไม่ตรงกับ actual stock
- **Decision:** Financial/Stock transactions MUST NEVER use UI Undo/Redo stack. ต้องแก้ผ่าน compensating transaction หรือลบใน History ledger. 
- **Impact:** `handleCancelTransaction()` ทำ manual stock reversal แยกจาก undoStack
- **Evidence:** `PROTOCOL_ENFORCER.md` Ledger Integrity section

### DEC-008: Inventory Module Restoration

- **Date:** May 2026
- **Context:** Inventory module ถูก archive ไปใน v2.x แล้วถูก restore กลับมาตามความต้องการ
- **Decision:** Restore และ rebuild inventory module จาก scratch ด้วย spreadsheet-style UI
- **Impact:** โมดูลที่ใหญ่ที่สุดในระบบ (1,358 lines)
- **Evidence:** `DB_SCHEMA.sql` comment "Re-activated from archived status"

### DEC-009: localStorage Priority for Column Widths

- **Date:** May 2026
- **Context:** Supabase fetch ช้ากว่า localStorage ทำให้เกิด Layout Shift เมื่อโหลดหน้า
- **Decision:** Load column widths จาก localStorage ก่อน แล้วจึง sync จาก Supabase
- **Impact:** Zero Layout Shift on page load
- **Evidence:** `page.tsx` lines 373-384, `PROTOCOL_ENFORCER.md` Persistent UI States

### DEC-010: DOM Separation for DnD & Framer Motion Integration

- **Date:** May 16, 2026
- **Context:** Style conflicts between `@dnd-kit` and `framer-motion` over the `transform` property caused stuttering and blocked layout gliding during drag events.
- **Decision:** Implement **DOM Separation**: Use an outer `div` (Wrapper) for Dnd-kit transforms and an inner `motion.div` (UI) for Framer Motion micro-interactions. Switch to `CSS.Translate.toString(transform)` for the wrapper to decouple layout from scaling.
- **Impact:** Frictionless layout gliding; cards slide smoothly while dragging.
- **Evidence:** `SortableEmployeeCard` in `LiveShiftList.tsx` (Lines 51-118).

### DEC-011: AI Agent Backend Deployment (Bru)

- **Date:** May 17, 2026
- **Context:** ต้องการสร้างระบบหลังบ้านสำหรับ AI Assistant ("บรู") เพื่อให้สามารถอ่านข้อมูลสต็อกสินค้าและตารางงานพนักงานได้อย่างปลอดภัยและมีประสิทธิภาพ
- **Decision:** สร้าง Read-Only Views (`view_today_shifts`, `view_inventory_summary`) และ RPCs (`get_ai_store_status`, `get_ai_inventory_item_details`) ใน Supabase เพื่อเป็นแหล่งข้อมูลสำหรับ AI. พร้อมทั้งสร้าง API Route Handler (`src/app/api/chat/route.ts`) ด้วย Vercel AI SDK v6, โดยใช้ `providerOptions.google.generationConfig.maxOutputTokens` และ `inputSchema` สำหรับ Tools.
- **Impact:** AI Assistant สามารถเข้าถึงข้อมูลที่จำเป็นได้อย่างปลอดภัยและถูกควบคุม. การใช้ AI SDK v6 standards ช่วยให้โค้ดเป็นมาตรฐานและดูแลรักษาง่าย.
- **Evidence:** `sql/ai_agent_views.sql`, `src/app/api/chat/route.ts`

### DEC-012: AI Agent Frontend UI (Bru)

- **Date:** May 17, 2026
- **Context:** ต้องการสร้างหน้าต่างแชท UI สำหรับ AI Assistant ("บรู") ที่เป็นมิตรต่อผู้ใช้งาน, มีความสวยงามแบบพาสเทล, และสามารถเปิด-ปิดได้ พร้อมทั้งบังคับใช้มาตรฐานการแสดงผลตัวอักษร.
- **Decision:** สร้าง `AIChatOverlay.tsx` component ด้วยดีไซน์กะทัดรัด (max-h-[70vh], overflow-y-auto), ตำแหน่งมุมล่างขวา, พร้อมแอนิเมชันเปิด-ปิดด้วย `framer-motion` (0.2s) และใช้ `isMounted` wrap ชั้นนอกสุดเพื่อป้องกัน `Math.random` ตอน Prerender. จากนั้นฝัง `<AIChatOverlay />` เข้าไปใน `src/app/[locale]/layout.tsx` โดยตรง และลบ `AIChatWrapper.tsx` ที่ไม่จำเป็นออก. บังคับใช้ `font-normal` หรือ `font-medium` สำหรับตัวหนังสือคำถาม-คำตอบทั้งหมดในหน้าต่างแชท.
- **Impact:** ผู้ใช้งานสามารถโต้ตอบกับ AI Assistant ได้อย่างสะดวกสบายและสวยงาม. โค้ด UI มีประสิทธิภาพและเป็นไปตามมาตรฐานการออกแบบ.
- **Evidence:** `src/components/ai/AIChatOverlay.tsx`, `src/app/[locale]/layout.tsx`

### DEC-013: Project-Wide Omni-Refactor (v3.4)

- **Date:** May 17, 2026
- **Context:** ต้องการทำ Project-Wide Omni-Refactor เพื่อกำจัด Dead Code, ตรวจสอบ AI Pipeline, และบังคับใช้ Visual Standards แบบ Autonomous
- **Decision:**
  1. ลบ `src/lib/agent-tools/` ทั้งโฟลเดอร์ (3 ไฟล์) — ไม่มี Import ใดๆ ในโปรเจกต์ (Orphaned)
  2. ลบ `src/types/supabase.ts` — ไฟล์ว่างเปล่า (0 bytes) ไม่มีประโยชน์
  3. แก้ไข Zero-Bold violation: `font-medium` → `font-normal` ใน `AIChatOverlay.tsx`
  4. เพิ่ม `isMounted` hydration guard ใน `AIChatOverlay.tsx`
- **Impact:** Codebase สะอาดขึ้น, Zero-Bold policy บังคับใช้ 100%, Hydration-safe AI Overlay
- **Evidence:** `docs/changelog.md` v3.4, `npm run build` Exit Code 0

### DEC-014: Persistent Date Range via Cookies (v3.5)

- **Date:** May 17, 2026
- **Context:** เมื่อผู้ใช้เปลี่ยนช่วงวันที่บน Dashboard หน้าระบบหลัก แล้วรีเฟรชหน้าจอ (F5) หรือเปลี่ยนหน้าไปมา ช่วงวันที่มักจะรีเซ็ตกลับเป็นค่าสัปดาห์ปัจจุบัน (Monday-Sunday) เสมอ ทำให้เสียเวลาในการกรองใหม่
- **Decision:** ฝังท่อจัดเก็บความจำวันที่ช่วง Dashboard:
  1. ในฝั่ง Client (`LiveShiftList.tsx`) เมื่อมีการเรียก `handleDateChange` ให้ทำการเขียนค่า `dashboard_start_date` และ `dashboard_end_date` ลงในเบราว์เซอร์ Cookies มีอายุยืนยาว 1 ปี (`max-age=31536000`, `SameSite=Lax`).
  2. ในฝั่ง Server (`dashboard/page.tsx`) ทำการดึงข้อมูลจาก `cookies()` ของ `next/headers` มาตรวจสอบก่อนเป็นอันดับแรก หากไม่มีค่าใน URL Parameters เพื่อนำมาใช้ในการคำนวณและแสดงผลช่วงข้อมูล shifts/holidays.
- **Impact:** ยกระดับ UX ในการจำค่าผู้ใช้ได้อย่างมีประสิทธิภาพสูงสุด ขจัดการรีเซ็ตช่วงวันที่โดยไม่ตั้งใจ และป้องกันปัญหา Layout Shift / Hydration Mismatch จากการจำวันฝั่ง client
- **Evidence:** `src/app/[locale]/dashboard/components/LiveShiftList.tsx` (lines 168-175), `src/app/[locale]/dashboard/page.tsx` (lines 20-30), `src/test/dashboard_date_cookies.test.ts`

### DEC-015: AI Agent Custom Branding Logo (v3.6)

- **Date:** May 17, 2026
- **Context:** หน้าต่างแชท AI ("บรู") เดิมทีใช้ไอคอนหุ่นยนต์ generic จาก Lucide-react (`Bot`) ซึ่งไม่ได้สะท้อนแบรนด์ของร้าน BLACKANDBREW และมีความพรีเมียมน้อยกว่าที่ต้องการ
- **Decision:** ทำการแทนที่ไอคอน `<Bot />` ทั้งหมด (ในส่วนหัว Header ของกล่องแชท, ในส่วนการ์ดโหลดคิดข้อความ, และในอวตารผู้ช่วยการตอบกลับ) ด้วยคอมโพเนนต์ `<Image />` ของ Next.js ที่ดึงรูปภาพจาก `/ai-agent-logo.svg` โดยตรง
- **Impact:** ยกระดับ UX/UI ของระบบการตอบรับของบรูอย่างสมบูรณ์แบบ รักษาขนาดและโครงสร้างการไหล (Layout Symmetry) อย่างดีเยี่ยม และไม่สร้าง Layout Shift หรือความขัดแย้งใน Zero-Bold Policy
- **Evidence:** `src/components/ai/AIChatOverlay.tsx` (lines 92-94, 128-130, 193-195)

### DEC-016: AI Agent UI Polish & Interaction (v3.7)

- **Date:** May 17, 2026
- **Context:** หน้าต่างแชท AI ("บรู") ต้องการความประณีต (Premium Look) ยิ่งขึ้น โดยเพิ่มการตอบสนองที่กระชับ ขนาดข้อความแชทที่สมดุล และช่องทางลัดในการปิดกล่องเมื่อพนักงานใช้งานแบบคล่องตัว
- **Decision:** ปรับปรุง UI 3 ส่วนหลัก:
  1. **ปุ่มลอยเปิดแชท:** เปลี่ยนไอคอน `<MessageCircle />` เป็นโลโก้ของแบรนด์ `/ai-agent-logo.svg` (ใส่สีขาวด้วยเอฟเฟกต์ `invert` บนปุ่มดำ) เพิ่มความสอดคล้องด้านแบรนดิ้ง
  2. **ขนาดตัวอักษร:** ปรับสเกลข้อความใน Bubble จาก `text-[13px]` เป็น `text-[15px]` เพื่ออ่านง่ายบนจอพนักงาน แต่คง `font-normal` (Zero-Bold Policy)
  3. **การปิดกล่องแชท:** เพิ่มตัวจับ Backdrop Layer (`bg-black/0` คลุมเต็มจอ) เมื่อคลิกนอกหน้าต่างแชทจะสั่ง `setIsOpen(false)` ทันที
- **Impact:** การควบคุมเสถียร Snappy ขึ้น สวยงามสอดคล้องกับพาสเทลและไอคอนแบรนด์ดั้งเดิม
- **Evidence:** `src/components/ai/AIChatOverlay.tsx` (lines 63-75, 83-92, 198-204)

### DEC-017: Typography Refinement & Contrast Tuning (v3.8)

- **Date:** May 17, 2026
- **Context:** หน้าต่างแชท AI ("บรู") เมื่อตัวอักษร Bubble มีขนาดใหญ่ขึ้น (`text-[15px]`) การใช้ความหนาแบบ `font-normal` (400) อาจทำให้เส้นดูหนาเทอะทะเกินไปในบางจอภาพ และหัวข้อย่อย (`text-[#000000]/40`) ยังมีความเปรียบต่างต่ำ อ่านยากภายใต้สภาพแสงในร้านกาแฟ
- **Decision:** ทำการปรับแต่งความสวยงามของตัวอักษรและสีในกล่องแชท:
  1. **ความบางตัวอักษร (Weight Calibrate):** ปรับความหนาของข้อความ Bubble จาก `font-normal` มาเป็น `font-light` (300) พร้อมเพิ่ม CSS helper `antialiased` เพื่อขัดเกลาเส้นตัวอักษรให้ดูบางเฉียบและคมชัดสูงสุด
  2. **ปรับแต่ง Contrast หัวข้อรอง:** เพิ่มระดับความเข้มของสีตัวอักษรในส่วนหัวแชทย่อย ("AI ผู้ช่วยร้าน BLACKANDBREW") และคำอธิบายความพร้อมใช้งาน ("กำลังคิด...") จากเดิมที่เป็นสีโปร่งบาง `text-[#000000]/40` ขึ้นมาเป็นสีดำเข้มแบบ Deep Coffee `#1a1a1a` เพื่อช่วยให้อ่านง่าย มีลำดับความสำคัญในการกวาดสายตา (Visual Hierarchy)
- **Impact:** ตัวอักษรอ่านง่าย สบายตา และมีสไตล์หรูหราแบบ Minimalist Pastel เข้ากับแบรนด์อย่างแท้จริง
- **Evidence:** `src/components/ai/AIChatOverlay.tsx` (lines 109, 143-145, 211)

### DEC-018: Strict Shift Count Validation in Summary Row (v3.9)

- **Date:** May 17, 2026
- **Context:** แถวสรุปผลรวมจำนวนพนักงานในตารางงาน (`ScheduleClient.tsx`) เดิมทีนับกะงานส่วนใหญ่โดยเว้นแค่ร้านซักผ้า, ไปสาขา 2, หรือลา แต่ไม่ได้มีเซ็ตการนับงานแบบระบุเฉพาะเจาะจง (Strict Work Shifts) ส่งผลให้มีความเสี่ยงที่จะนับกะที่เป็นงานอื่นนอกเหนือการบริการร้านเข้ารวมด้วย
- **Decision:** ปรับปรุงตรรกะการสรุปคอลัมน์ด้านล่างสุดของตารางงาน:
  - กำหนดเซ็ตของกะงานจริงที่อนุญาตให้คำนวณสรุป คือ `VALID_WORK_SHIFTS = ['6:30', '7:00', '8:00']`.
  - ในลูปคำนวณรวมคอลัมน์รายวัน `fohCount` ให้กรองเฉพาะตัวแปรโลเคชันกะงานที่อยู่ใน VALID_WORK_SHIFTS และตัดกะลาหรือ null อื่นๆ ออกอย่างเข้มงวด โดยที่ไม่กระทบการเรนเดอร์ใน Grid หลักของแต่ละเซลล์
- **Impact:** ตัวเลขสรุป FOH / บาริสตาในแต่ละวันถูกต้อง แม่นยำ และเป็นมาตรฐานเดียวกันทั่วทั้งระบบ ERP
- **Evidence:** `src/app/[locale]/schedule/ScheduleClient.tsx` (lines 950-954)

### DEC-019: Precise Deduplicated Summary Row Calculations (v3.10)

- **Date:** May 17, 2026
- **Context:** ยอดรวมพนักงานรายวันในแถวล่างสุดของตารางงานมีความคลาดเคลื่อนบวมขึ้นผิดปกติ เนื่องจากมีการนับรวมกะงานของพนักงานที่ถูกลบ/ไม่ใช้งานไปแล้ว (Inactive/Deleted Employees) ที่หลงเหลืออยู่ในประวัติระบบ และมีโอกาสที่พนักงานหนึ่งคนจะมีรายการกะงานซ้ำซ้อนในวันเดียวกัน
- **Decision:** พัฒนาการกรองข้อมูลแบบ Strict & Deduplicated:
  1. **กรองเฉพาะพนักงานปัจจุบัน (Active Filter):** เพิ่มตรรกะเช็ค `isActiveEmployee = s.employee_id && orderedProfileIds.includes(s.employee_id)` เพื่อให้มั่นใจว่าจะไม่นำกะงานของพนักงานที่ไม่ได้เรนเดอร์ในตารางมารวมในแถวสรุป
  2. **ป้องกันข้อมูลซ้ำซ้อน (Deduplication Check):** นำชุดข้อมูลกะงานไปแมปค่าเป็น `s.employee_id` แล้วครอบด้วย `new Set(...).size` เพื่อคัดกรองพนักงาน 1 คนให้นับเป็น 1 คนทำงานเท่านั้น (ไม่ว่าจะถูกบันทึกซ้ำกี่กะในวันนั้น)
- **Impact:** ยอดสรุปจำนวนคนบริการ FOH/Barista แม่นยำถูกต้อง 100% ตรงความเป็นจริงเชิงระบบ
- **Evidence:** `src/app/[locale]/schedule/ScheduleClient.tsx` (lines 950-960)

### DEC-020: Purchase Orders Pill-shaped Navigation Chips (v3.11)

- **Date:** May 17, 2026
- **Context:** แท็บแยกหมวดหมู่ช่องทางส่งคำสั่งซื้อ (Purchase Orders) ในหน้าต่างย่อย (Modal/Dialog) เป็นขีดเส้นใต้แบบคลาสสิก (`border-b-2`) ซึ่งดูธรรมดาและมีพื้นที่ใช้งานหนาแน่น ไม่เข้ากับวิสัยทัศน์ความเรียบหรูสากลและ Pastel ของร้าน BLACKANDBREW
- **Decision:** ปรับโครงสร้าง Wrapper และตัวปุ่มแท็บใหม่ทั้งหมด:
  1. **Wrapper Layout:** ใช้โครงสร้าง `flex flex-wrap gap-2.5 items-center pt-5 pb-4` เพื่อเพิ่มระยะห่าง ปรับโครงร่างแคปซูลชิปให้ลอยตัวและจัดวางอย่างเหมาะสม
  2. **Active Chip Style:** ใช้พื้นหลัง Soft Black (`bg-[#000000] border-[#000000] text-white`) สอดคล้องกับ Zero-Bold Policy (`font-normal`) อย่างเคร่งครัด
  3. **Inactive Chip Style:** ใช้กรอบบางเรียบหรูสีธรรมชาติ (`border-neutral-200 bg-transparent text-neutral-800 hover:bg-neutral-50`)
  4. **Data Numbers hierarchy:** ครอบตัวเลขจำนวนนับ (เช่น `(101)`) ด้วย `<span>` แยกต่างหากพร้อมปรับสัดส่วนข้อความให้เล็กลง (`text-[12px] font-mono font-normal` ในโทนสีโปร่งบางของ active/inactive)
- **Impact:** การนำทาง (Navigation Flow) สวยงามสะดุดตาตั้งแต่แรกเห็น สอดประสานกับมาตรฐาน Minimalist และ Zero-Bold Policy
- **Evidence:** `src/app/[locale]/inventory/page.tsx` (lines 1339-1360)

### DEC-021: High-Fidelity Schedule Image Export (v3.12)

- **Date:** May 17, 2026
- **Context:** พนักงานและผู้ใช้ต้องการดาวน์โหลดเฉพาะตัวตารางกะงาน (Schedule Grid) ออกมาเป็นรูปภาพคุณภาพสูงเพื่อพิมพ์หรือแชร์ในกลุ่มไลน์/โซเชียลมีเดียของร้าน โดยต้องไม่ติดปุ่มควบคุมด้านบนและแถบเมนูข้าง ๆ และต้องคมชัดอ่านง่ายไม่เบลอ
- **Decision:** พัฒนาระบบบันทึกรูปภาพตารางงานแบบคุณภาพสูง:
  1. **Dynamic Module Import:** นำเข้าไลบรารี `html2canvas` แบบไดนามิกภายในฟังก์ชัน `exportScheduleImage` เพื่อแก้ไขปัญหากระบวนการ SSR ของ Next.js บิวด์ไม่ผ่านเนื่องจากการอ้างอิง `window`/`document` บนเซิร์ฟเวอร์
  2. **High-Res Canvas Configuration:** ตั้งค่าให้ `html2canvas` สเกลภาพ `scale: 2` (2 เท่าของขนาดพิกเซลหน้าจอจริง) เพื่อความคมชัดเป็นเลิศเวลาซูมอ่านกะงาน และเลือกสีพื้นหลังเป็นครีมพาสเทล `#fdfcf0` ตามธีมหลักร้าน
  3. **Visual Targeting:** ฝัง `id="blackandbrew-schedule-table"` ที่ขอบเขตคอนเทนเนอร์หลักของตารางสัปดาห์ (Flipped Holiday Row, Header Columns, employee rows, foh sums) ป้องกันการนำส่วนอื่นๆ ที่ไม่เกี่ยวข้องมาคำนวณในรูปภาพ
  4. **Pill-shaped Button UI:** ดีไซน์ปุ่มเซฟรูปภาพพาสเทลระดับพรีเมียมสีเทา-สเลท สอดคล้องกับ Zero-Bold Policy เสมอ
- **Impact:** สะดวกรวดเร็วในการส่งกะงานต่อให้พนักงาน ความสวยงามและความคมชัดของรูปภาพออกมาตรงกับหน้าเว็บ 100%
- **Evidence:** `src/app/[locale]/schedule/ScheduleClient.tsx` (lines 6, 750-785, 843-851, 861)

### DEC-022: Swap Image Exporter to html-to-image (v3.13)

- **Date:** May 17, 2026
- **Context:** `html2canvas` ขาดการสนับสนุนฟังก์ชันสีสมัยใหม่ของ Tailwind (เช่น `oklch()` หรือ `lab()`) ทำให้การเรียกประมวลผล Canvas แครชทันทีเนื่องจากข้อผิดพลาดสีไม่รองรับ (Unsupported color parameters)
- **Decision:** เปลี่ยนตัวช่วยเรนเดอร์ตารางงานเป็นรูปภาพ:
  1. **Uninstall/Install Swap:** สั่งถอนการติดตั้ง `html2canvas` และสลับไปใช้ `html-to-image` ซึ่งรันผ่านเครื่องยนต์ SVG-to-Canvas ดึงค่าความต่างสี CSS และเลย์เอาต์ออกมาอย่างแม่นยำ 100%
  2. **Dynamic toPng Import:** ใช้การ Lazy-loading `const { toPng } = await import('html-to-image')` ภายในฟังก์ชัน `exportScheduleImage` เพื่อป้องกัน SSR compiling issue ของ Next.js
  3. **High-Density Scaling:** ตั้งค่า `pixelRatio: 2` และ `quality: 1.0` พร้อมกำหนดสีพื้นหลัง `#fdfcf0` เพื่อความคมชัดระดับสิ่งพิมพ์
- **Impact:** เลย์เอาต์และสีสันสมัยใหม่เรนเดอร์ออกมาถูกต้อง ครบถ้วน ไม่แครช มีความปลอดภัยสูงขึ้น
- **Evidence:** `src/app/[locale]/schedule/ScheduleClient.tsx` (lines 750-780)

### DEC-023: Precision Schedule Table Image Capture (v3.14)

- **Date:** May 17, 2026
- **Context:** รูปภาพตารางงานที่แชร์ออกไปติดขอบพื้นที่ว่าง (White Space) ขนาดใหญ่ที่ด้านล่างเนื่องจาก Wrapper หลักขยายตามหน้าจอแนวตั้ง (`flex-1`) และต้องการให้คอลัมน์ของวันและรายชื่อพนักงานเลื่อนตรงกัน 100% บนมือถือและแท็บเล็ต
- **Decision:** ปรับโครงสร้างเลย์เอาต์ DOM และสไตล์การถ่ายภาพของตาราง:
  1. **Grid Re-nesting:** ย้ายแท็กแสดงวันหยุด (Holiday row) และแท็กหัวตารางพนักงาน/วันสัปดาห์ (Day headers) เข้ามาอยู่ภายใน `overflow-x-auto` scrolling container เพื่อให้เลื่อนคู่กัน 100% ไม่บิดเบี้ยวบนจอขนาดเล็ก
  2. **Inner Container Targeting:** ถอน `id="blackandbrew-schedule-table"` ออกจาก flex wrapper นอกสุด และนำไปฝังไว้กับคอนเทนเนอร์ชั้นใน `min-w-[900px] h-fit flex flex-col` ซึ่งมีขนาดพิกเซลเท่ากับข้อมูลจริงเท่านั้น (ไม่มีพื้นที่ว่างด้านล่างบวมตามจอ)
  3. **Capture Options Style Reset:** เพิ่มตัวสไตล์รีเซ็ต (`margin: '0'`, `padding: '0'`, `border: 'none'`, `boxShadow: 'none'`) ชั่วคราวลงในออปชันของ `toPng` เพื่อลบขอบลอยตัวและเงา
- **Impact:** รูปภาพที่เซฟออกมาฟิตพอดีกับตัวตารางงานอย่างแม่นยำ 100% ไร้รอยบวมขอบขาวด้านล่าง และแก้ปัญหาคอลัมน์เยื้องบนอุปกรณ์หน้าจอสัมผัสขนาดเล็ก
- **Evidence:** `src/app/[locale]/schedule/ScheduleClient.tsx` (lines 752-780, 875-1012)










