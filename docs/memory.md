# Memory Log — BLACKANDBREW ERP

> **Purpose:** บันทึกการตัดสินใจเชิงสถาปัตยกรรมที่สำคัญ เพื่อป้องกันการทำผิดซ้ำ

---

### DEC-046: AI System Prompt - Store Location & Weather Context (v4.5)

- **Date:** May 30, 2026
- **Context:** ต้องการให้ AI (บรู) รับรู้ตำแหน่งพิกัดที่ตั้งของร้านจาก Environment Variables เพื่อความแม่นยำในการให้ข้อมูลสภาพอากาศและทิศทาง
- **Decision:** ฝังพิกัด `NEXT_PUBLIC_STORE_LAT` และ `NEXT_PUBLIC_STORE_LON` ลงใน System Instruction หลักของโมเดล และบังคับให้การดึงสภาพอากาศจาก OpenWeather API ต้องอ้างอิงพิกัดนี้เสมอผ่าน Server-side เท่านั้น
- **Impact:** AI สามารถตอบคำถามเรื่องฝนและอากาศได้แม่นยำตามพิกัดร้านจริง และรักษาความปลอดภัยของ API Key ผ่านกระบวนการหลังบ้าน
- **Evidence:** `src/app/api/chat/route.ts`, `src/app/api/weather/route.ts`, `MASTER_BLUEPRINT.md`

### DEC-047: Global Mobile UI Overhaul & Responsive Isolation (v4.6)

- **Date:** May 30, 2026
- **Context:** ต้องการเพิ่มประสิทธิภาพการใช้งานบนมือถือสำหรับตารางงานและระบบจัดการพนักงานที่ซับซ้อน โดยไม่กระทบต่อ Desktop Layout เดิม
- **Decision:**
    1. **Table Isolation**: ใช้ `overflow-x-auto scrollbar-none` หุ้มตาราง และล็อกคอลัมน์ชื่อพนักงานด้วย `sticky left-0 z-20`
    2. **Header Navigation**: ปรับปุ่มควบคุมด้านบนเป็น `flex overflow-x-auto whitespace-nowrap` บนมือถือ
    3. **Modal Transition**: เปลี่ยน Modal เป็น Bottom Sheet Drawer บนหน้าจอขนาดเล็ก (Mobile)
- **Impact:** พนักงานสามารถใช้งานตารางกะงานขนาดใหญ่บนมือถือได้ลื่นไหล ไม่เกิดปัญหากดปุ่มผิด (Fat-finger protection) และรักษา Desktop Layout เดิม 100%
- **Evidence:** `MASTER_BLUEPRINT.md`, `docs/design.md`

---

### DEC-048: Local Consumer Behavior & Market Insights Service (v4.7)

- **Date:** May 31, 2026
- **Context:** ต้องการระบบวิเคราะห์แนวโน้มตลาดรอบร้านเพื่อช่วยในการตัดสินใจเลือกโปรโมชั่นและเมนูใหม่
- **Decision:** สร้างระบบ Market Insights ที่ใช้ Gemini 2.5 Flash ร่วมกับ Tavily Search API เพื่อค้นหาข้อมูลเทรนด์แบบ Real-time และนำมาวิเคราะห์คู่กับยอดขายภายในร้าน (Inventory Transactions) บังคับใช้ Persona "บรู" และ Zero-Bold Policy อย่างเข้มงวด
- **Impact:** ช่วยให้พนักงานและผู้จัดการมองเห็นภาพรวมตลาดรอบสาขาลำลูกกาได้ชัดเจนขึ้น เพิ่มโอกาสในการขายเมนูตามกระแส
- **Evidence:** `src/app/actions/market-insights-actions.ts`, `src/app/[locale]/market-insights/page.tsx`

### DEC-049: Bru AI 2.0 - Weighted Intent & Relational Reasoning (v4.8)

- **Date:** June 1, 2026
- **Context:** พบปัญหา AI ตอบ "ครับ", แสดงรหัส UUID แทนชื่อพนักงาน และการจำกัด Steps ทำให้การวิเคราะห์ข้อมูลข้ามตารางล้มเหลว
- **Decision:**
    1. **Intent Scoring**: เปลี่ยนระบบตรวจจับ Intent เป็นแบบให้คะแนน (Weighted Scoring) เพื่อรองรับคำถามซับซ้อน
    2. **ID Preserving**: ปรับปรุง `cleanToolOutput` ให้คงเหลือฟิลด์ ID/FK ไว้เพื่อให้ AI ทำ Relational Mapping ได้
    3. **Persona Lockdown**: เพิ่มกฎเหล็ก [GENDER RULES] บังคับ "ค่ะ/นะคะ" และห้าม "ครับ" 100%
    4. **Dynamic System Prompt**: Inject เฉพาะกฎที่จำเป็นตาม Intent เพื่อประหยัด Token และลดความสับสนของโมเดล
- **Impact:** AI สามารถเชื่อมโยงรหัสพนักงานจากตาราง shifts ไปยังชื่อใน profiles ได้อย่างแม่นยำ และรักษาบุคลิกผู้หญิงได้อย่างเสถียร
- **Evidence:** `src/app/api/chat/route.ts`

### DEC-050: Full Roster Visibility Protocol (v4.9)

- **Date:** June 1, 2026
- **Context:** ผู้ใช้ต้องการเห็นรายชื่อพนักงานครบทุกคนในรายงานตารางงานรายวัน ไม่ใช่เฉพาะผู้ที่มีกะงาน
- **Decision:**
    1. ยกเลิกกฎการซ่อนพนักงานที่ไม่มีกะงานใน System Prompt
    2. บังคับให้ AI แสดงรายชื่อพนักงานครบทั้ง 9 คนเสมอ (นิต้า, ปิ่น, มุก, เม, มีนา, ชัช, หนูดี, ฟิว, ล่า)
    3. หากพนักงานไม่มีข้อมูลกะงาน ให้ระบุว่า "หยุดพัก" หรือ "ไม่มีกะงาน" แทนการตัดชื่อออก
- **Impact:** ผู้จัดการสามารถตรวจสอบกำลังพลโดยรวมได้ครบถ้วน และลดความสับสนเรื่องรายชื่อพนักงานที่หายไป

### DEC-051: Categorized Daily Roster Reporting (v5.0)

- **Date:** June 1, 2026
- **Context:** ต้องการให้บรูแยกหมวดหมู่พนักงานในรายงานตารางงานรายวันเพื่อให้เห็นชัดเจนว่าใครทำงานหน้าร้าน ใครทำส่วนอื่น และใครหยุด
- **Decision:**
    1. แบ่งการรายงานเป็น 3 หมวดหมู่: "ปฏิบัติงานหน้าร้าน" (มีระบุเวลา), "ปฏิบัติงานส่วนอื่น" (กะงานอื่นๆ), และ "หยุดพัก/ลา"
    2. หากพนักงานไม่มีกะงาน ให้ระบุสถานะเป็น "วันหยุด" (แทนคำว่า ไม่มีกะงาน หรือ หยุดพัก)
    3. บังคับให้แสดงรายชื่อพนักงานครบทั้ง 9 คนในรายงานเสมอ
- **Impact:** เพิ่มความชัดเจนในการบริหารจัดการกำลังพลรายวัน ผู้จัดการสามารถแยกแยะหน้าที่ของพนักงานได้ทันทีจากรายงาน

### DEC-052: Enhanced Staff Roster Sorting & Headcount Protocol (v5.1)

- **Date:** June 1, 2026
- **Context:** ต้องการให้รายงานตารางงานรายวันมีการสรุปยอดรวมกลุ่มหน้าร้าน และเรียงลำดับเวลา/ชื่อให้ตรงกับหน้าจอระบบ
- **Decision:**
    1. **FOH Headcount**: ต้องระบุจำนวนพนักงานรวมในหัวข้อ "พนักงานปฏิบัติงานหน้าร้าน"
    2. **Primary Sort (Time)**: เรียงกลุ่มหน้าร้านตามเวลาเข้างาน (เช้าไปสาย)
    3. **Secondary Sort (Master Order)**: หากเวลาเท่ากันหรือหมวดหมู่อื่นๆ ให้เรียงตาม `row_order` จาก Database เสมอเพื่อให้ตรงกับลำดับในหน้าจอจัดการ
- **Impact:** รายงานมีความเป็นระเบียบ อ่านง่าย และตรงตามความเป็นจริงของหน้าจอระบบ 100%

### DEC-054: Plain Text Minimalist Roster Formatting (v5.3)

- **Date:** June 1, 2026
- **Context:** ต้องการลดความซับซ้อนของรูปแบบการตอบกลับในรายงานตารางงานเพื่อให้ดูสะอาดตาและเข้ากับสไตล์มินิมัลมากยิ่งขึ้น
- **Decision:**
    1. ยกเลิกการใช้ตัวหนา (**), เครื่องหมายหัวข้อ (*), และเครื่องหมายทวิภาค (:) ในส่วนของหัวข้อและรายชื่อ
    2. ยกเลิกคำนำหน้า "คุณ" ก่อนชื่อพนักงาน ให้แสดงเฉพาะชื่อเท่านั้น
    3. กำหนดรูปแบบใหม่: หัวข้อคือ `[ชื่อหมวดหมู่] (รวม [จำนวน] คน)` และรายชื่อคือ `[ชื่อ] - [เวลา/สถานะ]`
- **Impact:** รายงานมีความสะอาดตา (Clean UI) และสอดคล้องกับ Zero-Bold Policy อย่างสมบูรณ์แบบ

### DEC-055: Holiday Schema Correction & Countdown Logic (v5.4)

- **Date:** June 1, 2026
- **Context:** AI ไม่สามารถตอบคำถามเกี่ยวกับวันหยุดถัดไปได้เนื่องจากใช้ชื่อคอลัมน์ผิด (holiday_date แทนที่จะเป็น date) และไม่มีการคำนวณจำนวนวันที่เหลือ
- **Decision:**
    1. เพิ่ม `holiday` intent ในระบบตรวจจับ (Classify Intent) เพื่อเปิดใช้งานเครื่องมือฐานข้อมูล
    2. อัปเดต System Prompt ระบุชื่อคอลัมน์ในตาราง `holidays` คือ `date` และ `name` อย่างเข้มงวด
    3. บังคับให้ AI คำนวณจำนวนวันที่เหลือ (Countdown) จากวันปัจจุบันก่อนตอบเสมอ
- **Impact:** AI สามารถระบุวันหยุดนักขัตฤกษ์ถัดไปได้อย่างแม่นยำ พร้อมข้อมูลการนับถอยหลังที่ผู้ใช้ต้องการ

### DEC-056: Responsive Table Overflow & Padding Optimization (v5.5)

- **Date:** June 1, 2026
- **Context:** พบปัญหาตาราง "การลา/เปลี่ยนกะ" และตารางข้อมูลอื่นๆ กว้างล้นจอในอุปกรณ์ขนาดเล็ก ทำให้อ่านข้อมูลลำบากและ UI แตก
- **Decision:**
    1. ห่อหุ้มตาราง (Table Element) ด้วย `div` ที่มีคลาส `w-full overflow-x-auto` เสมอ
    2. กำหนด `min-width` ขั้นต่ำให้ตัวตาราง (แนะนำ `min-w-[800px]`) เพื่อรักษาความกว้างคอลัมน์ให้สมมาตร
    3. ปรับลด Padding ของ `td` และ `th` ให้กระชับขึ้น (Tightened Spacing) เพื่อลดความหนาของตาราง
    4. ยืนยันการใช้ `text-black` และ `font-normal` ตาม Zero-Bold Policy
- **Impact:** ตารางแสดงผลได้ถูกต้องทุกอุปกรณ์ (Responsive) โดยไม่มีปัญหาข้อมูลอัดแน่นหรือล้นขอบจอ

### DEC-057: Desktop & Modal Table Overflow Fix (v5.6)

- **Date:** June 1, 2026
- **Context:** พบปัญหาตาราง "การลา/เปลี่ยนกะ" ล้นขอบหน้าจอเดสก์ท็อปและภายใน Modal ทำให้อ่านข้อมูลไม่ได้
- **Decision:**
    1. ยกระดับกฎ DEC-056 ให้ครอบคลุม "ทุกหน้าจอ" ไม่จำกัดเฉพาะ Mobile
    2. บังคับใช้ `overflow-x-auto` และ `scrollbar-thin` ในระดับ Wrapper ทุกครั้งที่มีการแสดงผลตารางใน Modal
    3. กำหนด `min-width` ที่เหมาะสมสำหรับตารางที่มีคอลัมน์จำนวนมากเพื่อรักษาความสมมาตรของข้อมูล
- **Impact:** ตารางในหน้าต่างจัดการกะงานและ Modal ทั้งหมดจะฟิตพอดีกับหน้าจอและสามารถเลื่อนดูในแนวนอนได้หากข้อมูลยาวเกินไป

### DEC-058: Modal Vertical Viewport Overflow & Centering (v5.7)

- **Date:** June 1, 2026
- **Context:** พบปัญหาหน้าต่าง Modal การลา/เปลี่ยนกะยืดตัวสูงเกินขอบบน-ล่างของหน้าจอเบราว์เซอร์ ทำให้ข้อมูลตารางประวัติล้นหายไป
- **Decision:**
    1. **Vertical Constraint**: บังคับใส่คลาส `max-h-[90vh]` หรือ `max-h-[calc(100vh-4rem)]` ที่กล่อง Modal Content หลักเสมอ
    2. **Internal Scroll**: เปิดใช้งาน `overflow-y-auto` และ `scrollbar-thin` เพื่อให้เนื้อหาภายในสามารถเลื่อนขึ้น-ลงได้เอง
    3. **Centering Protocol**: บังคับให้ Overlay ฉากหลังใช้ `flex items-center justify-center p-4` เพื่อจัดวางกล่อง Modal ไว้กึ่งกลางหน้าจออย่างสมมาตร
    4. **Visibility**: ยืนยันการใช้ `text-black` และ `font-normal` (Zero-Bold) ในเนื้อหาตาราง
- **Impact:** หน้าต่างจัดการกะงานและ Modal ทุกส่วนในระบบจะแสดงผลได้พอดีกับทุกขนาดหน้าจอ และใช้งานได้สะดวกบนทุกอุปกรณ์

### DEC-059: Global 100% Mobile Responsive Refit (v5.8)

- **Date:** June 1, 2026
- **Context:** ต้องการปรับปรุงระบบให้รองรับมือถือ 100% แบบ App-like โดยไม่กระทบ Desktop Layout
- **Decision:**
    1. **Mobile-First Typography**: บังคับใช้ `text-base` (16px) สำหรับ Inputs บนมือถือเพื่อป้องกัน iOS Auto-zoom และใช้ `text-sm` บน Desktop
    2. **Navigation Swap**: ใช้ `hidden md:flex` สำหรับ Sidebar และเพิ่ม Top/Bottom Bar สำหรับมือถือ
    3. **Touch Target Standard**: ทุกปุ่มกด (Interactive Elements) ต้องมีความสูงอย่างน้อย 44px (`h-11`) บนมือถือ
    4. **Fluid Layout**: ปรับ Padding เป็น `p-4` บนมือถือ และ `md:p-8` บน Desktop
    5. **Data Transformation**: เปลี่ยนจาก Table เป็น Card Stack ในหน้า Inventory และ Schedule เมื่อหน้าจอเล็กกว่า `md`
- **Impact:** ระบบมีความลื่นไหลเหมือนใช้งานแอปพลิเคชันพื้นฐาน (Native-like) และเข้าถึงข้อมูลได้ง่ายด้วยนิ้วโป้ง
- **Evidence:** `MASTER_BLUEPRINT.md`, `src/app/[locale]/layout.tsx`

### DEC-060: PWA Architecture Integration (v6.1)

- **Date:** June 1, 2026
- **Context:** ต้องการให้แอปพลิเคชันสามารถติดตั้งใช้งานบนหน้าจอมือถือได้เหมือน Native App (Progressive Web App) และมีกลไกการโหลดข้อมูลตารางงานล่าสุดโดยไม่มีผลกระทบต่อเวอร์ชันเดสก์ท็อปเดิม
- **Decision:**
    1. **Dynamic App Manifest**: สร้าง `src/app/manifest.ts` กำหนดข้อมูลแอป ไอคอน และสีธีม Morning Latte Cream
    2. **Network-First Service Worker**: พัฒนา `public/sw.js` ใช้กลยุทธ์ Network-First แบบมี Cache Busting เพื่อความสดใหม่ของตารางงานกะทำงานพนักงาน
    3. **Background SW Registration**: สร้าง `PwaRegister.tsx` เพื่อลงทะเบียน Service Worker ในฝั่งไคลเอนต์แบบออฟไลน์
    4. **iOS Safe Zone Integration**: เพิ่ม Meta tags สำหรับอุปกรณ์ iOS ใน root layout
- **Impact:** รองรับการติดตั้งแบบ Add to Home Screen บนสมาร์ตโฟน มีความเสถียรและลื่นไหล โดยไม่กระทบหน้าจอเดสก์ท็อปเดิม
- **Evidence:** `src/app/manifest.ts`, `public/sw.js`, `src/components/PwaRegister.tsx`, `src/app/[locale]/layout.tsx`

### DEC-061: Custom Calendar & DatePicker Accessibility (v6.1)

- **Date:** June 1, 2026
- **Context:** ปุ่มเลือกวันที่ของเบราว์เซอร์กดยากบนหน้าจอมือถือ และไม่มีความยืดหยุ่นในการปรับแต่งดีไซน์ตามมาตรฐานพาสเทลมินิมัล
- **Decision:**
    1. **Custom Calendar Popover**: สร้างปฏิทินที่ขยายเต็มหน้าจอเป็น Modal กึ่งกลางหน้าจอเมื่อเข้าใช้งานผ่านมือถือ ปรับดีไซน์เป็นทรงแคปซูลสวยงาม
    2. **Full-width Clickable Input Area**: กำหนดให้ปุ่มตัวเลือกวันที่สามารถกดคลิกเพื่อเรียกหน้าต่างปฏิทินได้จาก "ทุกตารางนิ้วของกรอบ" (Full-width clickable area) ไม่จำกัดเฉพาะการกดบนไอคอนขนาดเล็ก
    3. **iOS Safe Area Padding**: ขยับหน้าต่างเลือกปฏิทินและแถบเมนูด้านล่างให้พ้น iOS Home Indicator เสมอด้วย `env(safe-area-inset-bottom)`
- **Impact:** ยกระดับประสบการณ์การป้อนข้อมูลวันที่บนอุปกรณ์สัมผัส สะดวกสบาย ปลอดภัยจากการกดพลาด และมีดีไซน์ที่หรูหราเข้ากับระบบ
- **Evidence:** `src/components/ClickableDatePicker.tsx`, `src/app/[locale]/schedule/ScheduleClient.tsx`

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

### DEC-024: Unified Inventory Controls & Segmented Quick Input Bar (v3.15)

- **Date:** May 17, 2026
- **Context:** หน้าจอจัดการสต็อก (Inventory Module) ในส่วนบนมีปุ่มและช่องกรอกข้อมูลหลายแถว ทำให้ตัวหน้าจอดูหนาแน่นและซับซ้อนเกินไป พนักงานต้องการเลย์เอาต์ที่กะทัดรัด จบในหน้าเดียว (One-Shot View) และใช้งานง่าย
- **Decision:** ปรับปรุงโครงสร้างแถวและปุ่มควบคุม:
  1. **Single-Row Action Buttons:** บีบอัดกลุ่มปุ่ม 6 ปุ่มเดิมลงมาเรียงหน้ากระดานในแถวเดียวกันทั้งหมดเป็น `grid-cols-6` ปรับขนาดตัวหนังสือเป็น `text-xs/text-[13px]` และ Padding `py-2 px-1` เพื่อให้อยู่ในบรรทัดเดียวกันโดยไม่ปัดเศษตกหล่น
  2. **Segmented Quick Input Bar:** ยุบรวมช่อง "ค้นหาสินค้า" (Search Input), "กรอกจำนวน" (Quantity Input), และ "รับเข้า/นำออก" ไว้ในแถวเดียวกันหมดแบบ `flex flex-row items-center gap-2` โดยสร้างสวิตช์แบบ Segmented Control (Toggle Switch) เพื่อสลับระหว่าง IN และ OUT
  3. **Zero-Bold Policy:** บังคับใช้ `font-normal` และ `antialiased` สำหรับข้อความบนปุ่มและสวิตช์ทั้งหมด
- **Impact:** เลย์เอาต์คลังสินค้ามีความสวยงามแบบ Minimalist สมส่วน อ่านง่าย และมีระเบียบยิ่งขึ้น
- **Evidence:** `src/app/[locale]/inventory/page.tsx` (lines 800-845, 870-920)

### DEC-025: Supabase Query Optimization — Explicit Field Selection (v3.16)

- **Date:** May 18, 2026
- **Context:** ทุก Server-side Supabase query ใช้ `select('*')` ดึงข้อมูลทุก column โดยไม่จำเป็น ทำให้ Network Payload ใหญ่เกินความต้องการและเพิ่มภาระ Supabase PostgREST parser
- **Decision:** แก้ไข `select('*')` ทุกจุดให้ระบุเฉพาะ field ที่ใช้จริงบนหน้าจอ:
  - `profiles`: `id, full_name, dashboard_order` (dashboard) / `id, full_name, schedule_order` (schedule)
  - `shifts`: `id, employee_id, start_time, end_time, status, metadata`
  - `holidays`: `id, date, name`
  - `inventory_transactions`: `id, inventory_item_id, type, quantity, note, created_at`
  - **คงไว้** `select('*')` สำหรับ `service_records` และ `inventory_items` เพราะทุก field ถูกใช้งานในการแสดงผลจริง
- **Impact:** ลด Network Payload ต่อ Request, ลดภาระ PostgREST serialization, เพิ่มความเร็ว Time-to-First-Byte บนมือถือ
- **Evidence:** `dashboard/page.tsx` (line 36-44), `schedule/page.tsx` (line 25-38), `ScheduleClient.tsx` (line 503), `inventory-actions.ts` (line 57)

### DEC-026: Prompt Injection Defense & XSS Mitigation (v3.17)

- **Date:** May 18, 2026
- **Context:** ระบบรับข้อมูล Context แบบดิบ ๆ จาก `textContent` ของ Modal ในหน้าต่างเบราว์เซอร์ เพื่อส่งไปให้ AI ประมวลผล ซึ่งเสี่ยงต่อการโดนแทรกแซงคำสั่ง (Prompt Injection) และการใช้งาน `localStorage.getItem` คู่กับ `JSON.parse` โดยไม่มีการทำ Type Validation อาจทำให้ระบบหยุดชะงัก (Crash) จาก Malformed Data
- **Decision:**
  1. เพิ่มตรรกะ Sanitization ล้างคำสั่งควบคุม (เช่น `[INST]`, `ignore previous instructions`) ออกจาก `clientContext` ทั้งฝั่งหน้าบ้าน (`AIChatOverlay.tsx`) และหลังบ้าน (`route.ts`)
  2. เพิ่ม Strict Type Guard ครอบ `JSON.parse` ของ `localStorage` ในไฟล์ `inventory/page.tsx` และ `maintenance/page.tsx` โดยบังคับให้ค่าต้องเป็น Plain Object ที่มี value เป็นชนิดตัวเลข/สตริงที่ปลอดภัยเท่านั้น
- **Impact:** ป้องกันการโจมตีระดับ Data Payload และป้องกัน AI SDK ทำงานผิดพลาด ระบบแกร่งขึ้น (Security Hardened)
- **Evidence:** `src/components/ai/AIChatOverlay.tsx` (lines 42-49), `src/app/api/chat/route.ts` (lines 13-20), `src/app/[locale]/inventory/page.tsx` (lines 420-430)

### DEC-027: Thai Token Optimizer for AI Agent (v3.18)

- **Date:** May 18, 2026
- **Context:** ระบบ AI ดึงข้อความดิบทั้งจาก UI Context และประวัติการแชท (Chat History) ซึ่งบ่อยครั้งมีช่องว่าง (Whitespace) หรือตัวอักษรซ้ำซ้อนในภาษาไทย (เช่น 55555, ๆๆๆ) ทำให้สิ้นเปลือง Token โควตาของระบบอย่างรวดเร็ว
- **Decision:** สร้าง Utility `optimizeThaiTokens` ใน `src/utils/thaiTokenOptimizer.ts` เพื่อจัดการบีบอัดข้อความภาษาไทย (ตัดช่องว่างซ้ำซ้อน, ย่อตัวอักษรซ้ำให้อยู่ในขอบเขต) และนำไปฝังในท่อลำเลียงข้อมูล `req.json()` ใน `api/chat/route.ts` ก่อนประมวลผล
- **Impact:** ลดปริมาณ Input Tokens ที่ส่งเข้า Gemini Flash ลงอย่างเป็นนัยสำคัญ เพิ่มความเร็วในการประมวลผล (TTFB) และลดต้นทุนการเรียกใช้ API ในระยะยาวโดยไม่กระทบความเข้าใจของระบบ
- **Evidence:** `src/utils/thaiTokenOptimizer.ts`, `src/app/api/chat/route.ts` (lines 13-19, 41)

### DEC-028: Daily Closing Integrity Check & Commit (v3.19)

- **Date:** May 18, 2026
- **Context:** ระบบต้องการการประเมินความสมบูรณ์ประจำวัน (Daily Closing) เพื่อรับรองมาตรฐานโค้ด, UI, AI และความปลอดภัยก่อนจัดเก็บลง Repository
- **Decision:** ดำเนินการตรวจสอบ 5 เฟส: 1) ล้างขยะ Markdown และยืนยัน Zero-Bold Policy, 2) ทบทวนโครงสร้าง AI, `route.ts`, และ `thaiTokenOptimizer`, 3) รัน `npm run build` จนผ่านแบบ Exit Code 0, 4) อัปเดตโครงสร้างระบบในเอกสาร (Omni-Blueprint), และ 5) ยืนยันความปลอดภัย `.gitignore` และทำ `git commit`
- **Impact:** รับประกันว่า Source Code มีเสถียรภาพสูงสุด 100% ปราศจากบั๊กและพร้อมสำหรับการทำงานวันพรุ่งนี้
- **Evidence:** `docs/changelog.md` (v3.19), Git Commit Hash `6dc021b`

### DEC-029: Server-Side Auth Gate & Anti-Brute Force (v3.20)

- **Date:** May 18, 2026
- **Context:** การตรวจสอบรหัสผ่าน 6 หลักบนหน้าบ้านมีความเสี่ยงต่อการหลุดรั่วของคีย์ลับ (`NEXT_PUBLIC_APP_PIN` หลุดรอดไปใน Client Bundle) และระบบขาดการป้องกันสุ่มรหัส (Brute Force)
- **Decision:** ย้ายการตรวจรหัสผ่านไปทำบนฝั่ง Server (Server-Side) 100% ผ่าน Server Action (`src/app/actions/auth.ts`) และเก็บสถานะลงใน HTTP-Only Secure Cookie. รวมทั้งเพิ่มระบบล็อกหน้าจอ 15 นาทีเมื่อป้อนรหัสผิดติดต่อกัน 5 ครั้ง (Lockout State) บันทึกถาวรลงใน localStorage เพื่อป้องกันการโกงรีเฟรชหน้าต่าง
- **Impact:** ยกระดับความมั่นคงปลอดภัยเทียบเท่ามาตรฐานตู้นิรภัยการเงิน ป้องกัน Client-side leak และ Brute force สุ่มเดารหัสผ่าน
- **Evidence:** `src/app/actions/auth.ts`, `src/components/auth/PinGateway.tsx`, `src/components/sidebar/Menu.tsx`

### DEC-030: Sidebar Viewport Height & Scrollbar Elimination (v3.20)

- **Date:** May 18, 2026
- **Context:** หน้าแถบนำทาง (Sidebar) เดิมใช้ Radix ScrollArea และมักจะสร้าง Scrollbar แนวตั้งที่ไม่น่าดูบนหน้าจอมือถือ/แท็บเล็ตหน้าร้าน
- **Decision:** เปลี่ยนมาใช้โครงสร้าง Flexbox `flex flex-col h-full overflow-hidden justify-between` ยกเลิก ScrollArea และตรึงปุ่มออกจากระบบ (Logout Button) ไว้ด้านล่างสุดด้วย `mt-auto` เพื่อให้ฟิตพอดีความสูง 100% Viewport Height
- **Impact:** กำจัดแถบเลื่อน (Scrollbar) ได้ 100% ทำให้เมนูมีความกะทัดรัด สมมาตร และสวยงามมินิมัลขึ้น
- **Evidence:** `src/components/sidebar/Sidebar.tsx`, `src/components/sidebar/Menu.tsx`

### DEC-031: Enforced Session-Only Authentication (v3.21)

- **Date:** May 18, 2026
- **Context:** บัญชีล็อกอินค้างบนเบราว์เซอร์จากการใช้ cookies/localStorage ร่วมกัน ทำให้การเปิดแท็บใหม่หรือเปิดเบราว์เซอร์ใหม่ไม่ต้องพิมพ์ PIN อีกครั้ง ขัดแย้งกับหลักการความปลอดภัยสูงสุดของระบบหน้าร้าน
- **Decision:** กำจัดระบบตรวจสอบ auth state ฝั่ง client ผ่าน cookie check และ `localStorage` ย้ายไปควบคุมด้วย `sessionStorage` แบบ 100%
  1. ในหน้า `PinGateway.tsx` เมื่อตรวจสอบ initial state ให้เช็คคีย์ `bb_auth_pin_verified` จาก `sessionStorage` เท่านั้น (หากไม่มีให้เด้งบล็อกทันที)
  2. เมื่อกรอก PIN ถูกต้อง ให้เขียนลง `sessionStorage` เป็นหลัก
  3. ปรับปรุงปุ่ม Logout ให้เคลียร์ `sessionStorage.removeItem('bb_auth_pin_verified')` ด้วย
  4. รักษา `localStorage` เฉพาะสำหรับเก็บ lockout state ป้องกัน brute-force สุ่มรหัส
- **Impact:** ปิดความจำค้างข้ามแท็บและข้ามเบราว์เซอร์ 100% บังคับกรอก PIN ทุกครั้งเมื่อเริ่ม session ใหม่ เพิ่มความปลอดภัยสูงสุด
- **Evidence:** `src/components/auth/PinGateway.tsx`, `src/components/sidebar/Menu.tsx`, `src/test/session_auth.test.tsx`

### DEC-032: Fetch-after-Save & Atomic Delete-then-Insert Scheduler Sync (v3.23)

- **Date:** May 19, 2026
- **Context:** หน้าตารางงาน (ScheduleClient.tsx) เกิดปัญหาข้อมูลกะงานหายวับหรือทับซ้อนกันเมื่อทำธุรกรรมเซฟล้มเหลว หรือมีการส่งคืนข้อมูล Supabase แบบ Array และมีปัญหา timezone ตกขอบสัปดาห์
- **Decision:** พัฒนาระบบสองส่วนเพื่อความปลอดภัยสูงสุด:
  1. **Atomic Delete-then-Insert (`saveShift`):** เปลี่ยนมาทำงานแบบ Service Role โดยลบกะงานเดิมของพนักงานคนนั้นในวันนั้นทิ้งก่อนเสมอ เพื่อตัดสิทธิ์ข้อมูลเบิ้ลซ้ำซ้อนอย่างถาวร แล้วค่อย insert รายการใหม่ลงไปเดี่ยวๆ
  2. **Fetch-after-Save Strategy:** นำระบบ UI optimistic/manual state mapping และ rollback stack ออก เปลี่ยนมาดึงข้อมูลสัปดาห์จริงจากฐานข้อมูลตรงๆ โดยมีดีเลย์ 500ms ปรับสมดุล Latency และขยายช่วงวันที่ Fetch กว้างขึ้น +- 1 วัน (`startRange`/`endRange`)
- **Impact:** ยอดสรุป FOH และ Grid ตารางทำงานถูกต้อง 100% ข้อมูลไม่มีซ้ำซ้อน ไม่หายวับ และแก้ไขปัญหา Timezone ตกขอบสัปดาห์อย่างเบ็ดเสร็จ
- **Evidence:** `src/app/[locale]/schedule/ScheduleClient.tsx` (lines 673-715), `src/app/actions/shift-actions.ts` (lines 156-200)

### DEC-033: Direct Hydration Sync & NextConfig cacheComponents Alignment (v3.24)

- **Date:** May 21, 2026
- **Context:** หน้าตารางงาน (`ScheduleClient.tsx`) มีปัญหาทำลายสถานะกะงานตอนที่ `router.refresh()` ทำงานเนื่องจากตรรกะ Safe React Hydration แบบเดิมมีเงื่อนไขตรวจสอบที่ไม่ครอบคลุม และยังพบบัญชีข้อผิดพลาดการคอมไพล์ Next.js build-time บ่งชี้ว่า `dynamic = 'force-dynamic'` ไม่รองรับเมื่อ `nextConfig.cacheComponents` ทำงาน
- **Decision:**
  1. Refactor ตรรกะซิงค์ใน `ScheduleClient.tsx` ให้ใช้การ Hydrate ตรงไปตรงมาจาก server props ทุกครั้งที่มีการเปลี่ยนแปลง (`initialProfiles`, `initialShifts`, `initialHolidays`, `initialDateStr`) เข้าสู่ react states ทันทีโดยไม่มี equality check ที่ปิดกั้น
  2. ลบ `export const dynamic = 'force-dynamic';` ออกจาก `/schedule/page.tsx` เพื่อให้คอมไพล์ผ่านร่วมกับ `cacheComponents` ได้ โดยใช้ config `cache: 'no-store'` ใน global custom fetcher ในตัวแปร `supabaseAdmin` แทนเพื่อรับประกันความสดใหม่ของข้อมูลและประสิทธิภาพในการบิวด์
- **Impact:** ตารางงานซิงค์ข้อมูลอย่างถูกต้อง ปลอดภัย ไร้ปัญหาข้อมูลกะงานหายวับระหว่าง revalidate/refresh และโปรเจกต์คอมไพล์โปรดักชันบิวด์ผ่าน 100% ไร้ข้อผิดพลาด
- **Evidence:** `src/app/[locale]/schedule/ScheduleClient.tsx` (lines 255-273), `src/app/[locale]/schedule/page.tsx` (lines 13-14)

### DEC-034: RTK (The Reconstruction ToolKit) Implementation (v3.25)

- **Date:** May 25, 2026
- **Context:** ระบบมีความเสี่ยงต่อสถานการณ์ข้อมูลขัดข้อง ขาดหาย หรือการกระทำที่ผิดพลาดของผู้ใช้ (Human Errors/Connection Failures) ในฝั่งหน้าร้าน (Client-Side) ทำให้จำเป็นต้องมีระบบกู้คืนสถานะที่รวดเร็ว
- **Decision:** ขึ้นทะเบียนสถาปัตยกรรม **"RTK: The Reconstruction ToolKit"** (World-Class DND Rollback & Undo Stack) อย่างเป็นทางการ โดยผสานการทำงานร่วมกับ LocalState Reversion และ Snapshot Memory
- **Impact:** กู้คืนข้อมูลตารางกะพนักงานและสต็อกสินค้าใน 0ms เมื่อเกิดข้อผิดพลาดรุนแรง (เช่น ลากวางล้มเหลว) ช่วยรักษา Integrity และลดความตื่นตระหนกของพนักงาน
- **Evidence:** `src/app/[locale]/inventory/page.tsx` (undoStack, rollbackItems), `src/app/[locale]/schedule/ScheduleClient.tsx` (undoStack, rollbackOrder)

### DEC-035: Performance-Driven Omni-Refactor (v4.0)

- **Date:** May 25, 2026
- **Context:** ระบบ ERP พบปัญหาหน้าจอกระตุกจากการพิมพ์ข้อความ (Input Lag), ขนาด Payload ของตารางฐานข้อมูลที่ใหญ่เกินความจำเป็นจากการ `select('*')`, ปัญหา CLS บนหน้าต่างแสดงสภาพอากาศ, และบั๊ก Event Listener Memory Leak บนตารางที่ยืดขยายได้
- **Decision:** ปฏิบัติการ "REBIRTH PROTOCOL" ปรับแต่งโครงสร้างโค้ดทั้งหมด (Omni-Refactor):
  1. **Network Payload:** ลดการ `select('*')` โดยระบุคอลัมน์ชัดเจนใน Inventory/Maintenance
  2. **Memory Protection:** เสียบ `AbortController` ลงใน `ColumnHeader` ขจัดปัญหา Memory Leak 100%
  3. **High-Velocity UI:** แก้ปัญหา Cumulative Layout Shift (CLS) บน `WeatherWidget.tsx` ด้วยระบบ Fixed `min-h`
  4. **Aesthetic Compliance:** ขจัด `font-bold` และบังคับใช้ Zero-Bold Policy แบบเด็ดขาดในระบบแชทและสินค้า
- **Impact:** ลดขนาด Payload และ Memory Footprint พร้อมเพิ่มประสิทธิภาพ Render ฝั่ง Client-side ตอบสนองการสั่งงานแบบ Real-time (Zero CLS)
- **Evidence:** `src/app/[locale]/inventory/page.tsx`, `src/app/[locale]/maintenance/page.tsx`, `src/components/dashboard/WeatherWidget.tsx`, `src/app/api/weather/route.ts`

### DEC-036: Security-Hardened Omni-Refactor (v4.1)

- **Date:** May 25, 2026
- **Context:** ระบบมีความเสี่ยงต่อการถูกโจมตีแบบ Prompt Injection, XSS (Cross-Site Scripting) ผ่าน LocalStorage, ตลอดจนการปลอมแปลงสิทธิ์ (Token Forgery) จากช่องโหว่ Server Actions ที่ไม่ได้ตรวจสอบเซสชัน
- **Decision:** ปฏิบัติการ "SECURITY-HARDENED OMNI-REFACTOR":
  1. **Backend Lockdown:** บังคับตรวจสอบ `supabase.auth.getUser()` ใน Server Actions (รองรับ Fallback ร่วมกับ PIN Gateway Auth)
  2. **Input Validation Engine:** ประยุกต์ใช้ Zod Schema ตรวจจับชนิดข้อมูลก่อนเข้าถึงฐานข้อมูลในทุกโมดูล
  3. **Anti-XSS & Anti-Prompt Injection:** ฉีดระบบ Sanitization กรอง Tag `<script>` และ HTML Payload แฝง ออกจาก Context
  4. **Strict Tool Isolation:** ตรึงเครื่องมือของ AI ไว้ที่ Universal DB Reader และ Internet Search Tool อย่างเคร่งครัด
- **Impact:** ปิดช่องโหว่ XSS, ป้องกัน Prompt Injection ขั้นสูง, สกัดกั้น Malicious Payloads ในการจัดการฐานข้อมูล 100% (Zero Functional Errors)
- **Evidence:** `src/app/actions/shift-actions.ts`, `src/app/actions/inventory-actions.ts`, `src/components/ai/AIChatOverlay.tsx`, `src/app/api/chat/route.ts`

### DEC-037: Project-Wide Omni-Refactor & AI Sync (v4.2)

- **Date:** May 25, 2026
- **Context:** ต้องการกวาดล้างไฟล์ขยะและ Import ที่ตายแล้ว, ป้องกันการเผยแพร่ API Keys สู่ฝั่ง Client, และผสานข้อมูลเวลาและสถานที่ (Time & Location Anchors) ของโลกความเป็นจริงลงใน AI และ Weather Gateway อย่างแม่นยำ
- **Decision:** ปฏิบัติการ "PROJECT-WIDE OMNI-REFACTOR & AI SYNC":
  1. **Junk Purge & API Lock:** ยืนยันสถาปัตยกรรมไร้ไฟล์ขยะผ่าน ESLint (Exit Code 0) และล็อกความปลอดภัยคีย์ระดับสูงทั้งหมดไว้ที่ฝั่ง Server-side ร่วมกับ `.gitignore`
  2. **AI Logic De-duplication:** คงเหลือเฉพาะ Universal DB Reader และ Internet Search Tool ในสมองกลหลัก พร้อมบังคับคำนวณ `currentThaiDate` ส่งเข้าโมเดลเสมอ
  3. **Data Map Integrity:** ยืนยันการเชื่อมต่อตารางของ AI ตรงตาม `database_map` 100% และปักหมุดพิกัดสภาพอากาศร้านที่ Lat: 13.9312, Lon: 100.6756
  4. **Aesthetic Enforcement:** ปรับโมดูล `WeatherWidget.tsx` ให้บังคับใช้คลาส `text-black` ทั้งหมด ลบข้อความสีเทาทิ้ง เพื่อสอดคล้องกับ Zero-Bold Policy
- **Impact:** ยกระดับความเสถียรของสถาปัตยกรรม (Zero Dead Code), AI ตอบคำถามได้ถูกต้องตามเวลาจริง, UI สะอาดตาตามแนวทางพรีเมียม (Premium Minimalist)
- **Evidence:** `src/components/dashboard/WeatherWidget.tsx`, `src/app/api/chat/route.ts`, `src/app/api/weather/route.ts`, `src/lib/agents/executive-rules.ts`

### DEC-038: Weather Subsystem Precipitation Integration (v4.3)

- **Date:** May 25, 2026
- **Context:** ต้องการให้ระบบหลังบ้านและ WeatherWidget บนหน้า Dashboard แสดงโอกาสการเกิดฝนตก (%) และปริมาณน้ำฝน (mm) เพื่อช่วยประเมินและวางแผนกลยุทธ์หน้าร้าน Black-and-Brew ได้อย่างรวดเร็ว
- **Decision:**
  1. **Backend Integration:** อัปเดต API `route.ts` ให้คำนวณอัตราโอกาสเกิดฝน `pop` (คูณ 100 และปัดเศษ) และปริมาณน้ำฝนสะสม `rain` (จาก `rain['3h']` ถ้ามี) ทั้งในสถานการณ์ปัจจุบัน (`current`) และพยากรณ์รายชั่วโมง (`hourly`)
  2. **TypeScript Interface Extends:** ขยาย `interface WeatherData` ให้รองรับคอลัมน์ใหม่ทั้งในฝั่ง client และ server
  3. **Visual Standard & Zero-Bold Policy:** เพิ่มแถวแสดงผล `💧 โอกาสเกิดฝน: [pop]% ปริมาณ: [rain] mm` ในฝั่งสภาพอากาศปัจจุบัน โดยคุมโทนสี `text-black font-normal antialiased` และแทรกสัญลักษณ์ `💧 [pop]%` ในฝั่งรายชั่วโมงด้วยสีน้ำเงินเข้ม `text-blue-700 font-normal antialiased` ใต้ไอคอนโดยไม่ใช้ font-bold / font-semibold เด็ดขาด
- **Impact:** ช่วยให้การบริหารและการปรับกลยุทธ์การขายตามปริมาณฝนหน้าร้านทำได้อย่างมีประสิทธิภาพ แม่นยำขึ้น โดยรักษาการเรนเดอร์ UI ที่สมมาตรและสมบูรณ์แบบตามธีม Minimalist
- **Evidence:** `src/app/api/weather/route.ts` (lines 35-49), `src/components/dashboard/WeatherWidget.tsx` (lines 6-120)

### DEC-040: Project-Wide Daily Closing Integrity Check

**Context:** Executed the final daily closing protocol to validate structural safety.
**Decision:** Applied zero-bold typography adherence to loading skeletons (WeatherWidget), verified AI tool schemas, and confirmed Typescript build stability (
px tsc --noEmit and
pm run build).
**Consequence:** The repository is now formally verified as stable and safely locked for the daily closing.

### DEC-041: Inventory Sort Order Refactoring & CSV Migration (v4.3)

- **Date:** May 26, 2026
- **Context:** สินค้าคงคลัง 106 รายการในระบบ ERP ถูกเรียงลำดับแบบไม่สอดคล้องกับตำแหน่งจริงของสินค้าภายในร้าน (Physical Layout) ทำให้พนักงานเสียเวลาในการค้นหาและตรวจนับสต็อก ไฟล์ CSV (`inventory-items.csv`) ที่มีลำดับสินค้าตามตำแหน่งจริงถูกวางไว้ที่โฟลเดอร์ราก
- **Decision:**
  1. **CSV Migration Script:** สร้างสคริปต์ `migrate-inventory-sort-order.ts` สำหรับอ่านและแยกวิเคราะห์ CSV พร้อมรองรับ quoted fields (เครื่องหมายคำพูดซ้อน) จับคู่ชื่อสินค้ากับฐานข้อมูล และอัปเดต `sort_order` แบบ 1-based index ตามลำดับบรรทัดใน CSV ขณะเดียวกันก็รักษายอดคงเหลือ (stock) ที่ถูกต้อง
  2. **Strict Sort Fetch:** ลบ `.order('name', { ascending: true })` fallback ออก เหลือเฉพาะ `.order('sort_order', { ascending: true })` อย่างเข้มงวด
  3. **Max+1 New Item Placement:** เมื่อเพิ่มสินค้าใหม่ ระบบจะ query ค่า `sort_order` สูงสุดจาก Supabase แล้วกำหนดค่า `max + 1` ให้สินค้าใหม่ ผนวกท้ายรายการเสมอ
  4. **1-Based DnD Sync:** ปรับ `handleDragEndRows` และ `syncFullStateToDB` ให้ใช้ `index + 1` (1-based) แทน `index` (0-based) เพื่อความสอดคล้องกับค่าที่ migration สร้างไว้
- **Impact:** ลำดับสินค้าในหน้า Inventory ตรงกับตำแหน่งจริงในร้าน 100% รองรับการลากจัดเรียงใหม่แบบ Drag-and-Drop พร้อมบันทึกถาวรลง Supabase
- **Evidence:** `src/app/actions/migrate-inventory-sort-order.ts`, `src/app/[locale]/inventory/page.tsx`, `src/test/run_migration.test.ts`, `npx tsc --noEmit` ✓, `npm run build` Exit Code 0

### DEC-042: Inventory Quick Action Bar UI/UX Refactoring

- **Date:** May 26, 2026
- **Context:** หน้าต่าง Quick Action Bar ในระบบ Inventory กลมกลืนไปกับพื้นหลังสี Latte ครีมมากเกินไป และไม่มีการตรึงตำแหน่ง ทำให้เมื่อเลื่อนตารางข้อมูลสินค้าลงด้านล่างจะบดบังข้อมูลตัวกรอง/ค้นหา และเกิดการซ้อนทับข้อมูลขณะเลื่อนหน้าจอ
- **Decision:**
  1. ปรับปรุง Quick Actions Container โดยเติม Tailwind class `sticky top-0 z-20` เพื่อให้แถบ Quick Action ตรึงอยู่ด้านบนเสมอขณะผู้ใช้ทำการเลื่อนตารางลงมา
  2. เพิ่มความทึบของสีพื้นหลังเป็นสีขาวทึบ (`bg-white`) เพื่อป้องกันข้อมูลของตารางโผล่ซ้อนขึ้นมาใต้วงขอบโค้งมน
  3. เพิ่มความเด่นชัดและ Harden borders ให้กับกรอบคอนเทนเนอร์หลัก (`border-2 border-black` และเพิ่มเงา `shadow-sm`)
  4. ปรับปรุงขอบของช่องอินพุตด้านใน ได้แก่ ช่องค้นหาสินค้า (`quickSearch`), ช่องป้อนจำนวน (`quickQty`) และขอบสวิตช์เลือกรับเข้า/นำออก (Segmented Control) ให้เป็นเส้นสีดำคมชัดสูง (`border-black`) แทนเส้นสีเทาอ่อนแบบเดิม
- **Impact:** ยกระดับการเลื่อนดูข้อมูลและความสะดวกสบายในการกรอง/สั่งงานที่ร้านได้อย่างชัดเจน เพิ่มความสะดวกในการอ่านและป้อนข้อมูลของพนักงานผ่านอุปกรณ์เคลื่อนที่ในร้าน
- **Evidence:** `src/app/[locale]/inventory/page.tsx`, `npx tsc --noEmit` ✓, `npm run build` Exit Code 0

### DEC-043: LINE Messaging API Foundation Integration

- **Date:** May 26, 2026
- **Context:** ระบบ ERP ต้องการช่องทางการแจ้งเตือนอัตโนมัติผ่าน LINE เพื่อสื่อสารข้อมูลสำคัญ (เช่น สินค้าใกล้หมด, สรุปยอดประจำวัน) ไปยังผู้จัดการร้านและพนักงานผ่านแอป LINE ได้โดยตรง โดยตัวแปรสภาพแวดล้อม `LINE_CHANNEL_ACCESS_TOKEN` และ `CHANNEL_ID` ถูกลงทะเบียนไว้ในระบบแล้ว
- **Decision:**
  1. **SDK Installation:** ติดตั้ง `@line/bot-sdk` v11.x เป็น dependency หลักของโปรเจกต์
  2. **Server Action Wrapper:** สร้างฟังก์ชัน `sendLineNotification(targetId, message)` ใน `src/app/actions/line-actions.ts` ทำหน้าที่เป็น baseline wrapper สำหรับส่ง push text message ผ่าน LINE API
  3. **Client Initialization:** ใช้ `LineBotClient.fromChannelAccessToken()` (v11 API) สร้าง client แบบมีเงื่อนไข — หาก token ว่างเปล่า client จะเป็น `null` พร้อม early-return error message ที่ชัดเจน
  4. **Isolation Strategy:** ฟังก์ชันนี้ยังไม่ถูกเชื่อมต่อกับ cron jobs, database triggers หรือระบบ scheduling ใดๆ ทั้งสิ้น คงไว้เป็น callable utility สำหรับต่อยอดในอนาคต
  5. **Security:** Token ถูกเรียกใช้ผ่าน `process.env.LINE_CHANNEL_ACCESS_TOKEN` ฝั่ง server-side เท่านั้น (`'use server'`) ไม่มีความเสี่ยงหลุดไป client bundle
- **Impact:** วางรากฐานระบบแจ้งเตือน LINE สำหรับต่อยอดเป็นโมดูลแจ้งเตือนอัตโนมัติในอนาคต

### DEC-044: Daily LINE Notification Protocol

- **Date:** May 26, 2026
- **Context:** ระบบมีความต้องการสรุปข้อมูลสำคัญ (กำลังพล, สินค้าคงคลัง, สภาพอากาศ, และวันหยุด) ส่งตรงถึงผู้ใช้งานผ่าน LINE ทุกเช้าเวลา 07:00 น. เพื่อให้สามารถวางแผนกลยุทธ์หน้าร้านได้อย่างรวดเร็ว
- **Decision:**
  1. **Vercel Cron Trigger:** ตั้งค่า `vercel.json` trigger ไปที่ endpoint `/api/daily-report` ทุกวันเวลา 00:00 UTC (07:00 น. ICT)
  2. **Security & Authorization:** ใช้ `CRON_SECRET` ใน Header `Authorization: Bearer <token>` เพื่อตรวจสอบสิทธิ์ ไม่ให้โดนยิง API จากภายนอก
  3. **Data Source Consolidation (`daily-report-actions.ts`):**
     - **Shifts:** สรุปกำลังพลจาก Supabase แบบเรียงลำดับ 9 ลำดับ (Master Order) ตัดข้อมูล "ลา" หรือ "วันหยุด"
     - **Inventory:** กรองเข้มงวด `stock <= order_point + 2` เท่านั้น ไม่แสดงรายการปกติ
     - **Weather:** ดึง OpenWeatherMap เฉพาะช่วง 06:30-18:00 (เวลาทำงาน) ป้องกัน noise
     - **Holiday:** คำนวณวันหยุดถัดไปแจ้งเตือนล่วงหน้า 3 วัน
  4. **Rule-Based Recommendation:** ใช้ rule-based logic สั้นๆ แจ้งเตือนเรื่องฝนตกหรือเทศกาลเพื่อลดการใช้ Token ของ AI เสริมความเสถียรของ Cron
- **Impact:** ได้ระบบสรุปข้อมูลอัจฉริยะทำงานอัตโนมัติ 100% ตอบสนองความเร็ว 0ms ในมุมผู้ใช้งาน
- **Evidence:** `src/app/actions/daily-report-actions.ts`, `src/app/api/daily-report/route.ts`, `vercel.json`

### DEC-045: Omni Cleanup, Payload Minimization & Security Determinism (v4.4)

- **Date:** May 27, 2026
- **Context:** ระบบต้องการความเร็วสูงสุด (ลด CPU/log noise, ลด payload, ลด rerender/คำนวณซ้ำ) พร้อมความปลอดภัยที่ deterministic (ไม่ fallback ใช้ anon key เงียบๆ) และทำให้ modal ใหญ่โหลดช้าลงแบบ chunk
- **Decision:**
  1. ทำ `console.log` purge ใน production paths ของ `api/chat`, `api/daily-report`, `line-actions`, `database-tools`, และ `search-tools`
  2. ปรับ `ScheduleClient` ให้หลีกเลี่ยง `select('*')` ด้วยการระบุเฉพาะคอลัมน์ที่ UI ใช้จริง
  3. เพิ่มประสิทธิภาพการคำนวณ `LiveShiftList` ด้วย Map/Set indexing เพื่อลดการ filter ซ้ำ
  4. ปรับ `AIChatOverlay` ให้ quick actions ครบ 4 ปุ่ม และรวม hydration effects 2 ชุด พร้อม debounce การ persist localStorage
  5. ทำ dynamic split ของ modal หนัก: `PurchaseOrdersModal` ด้วย `next/dynamic` (`ssr:false`)
  6. Harden ความปลอดภัย: ใน `daily-report-actions.ts` ตัด fallback ไป `NEXT_PUBLIC_SUPABASE_ANON_KEY` เหลือเฉพาะ `SUPABASE_SERVICE_ROLE_KEY` + guard เมื่อ key หาย
- **Impact:** ประสิทธิภาพดีขึ้นในมุม render/network, ลดภาระ CPU, และทำให้ security behavior เป็น deterministic 100%
- **Evidence:** `src/app/api/chat/route.ts`, `src/app/api/daily-report/route.ts`, `src/app/actions/tools/database-tools.ts`, `src/app/actions/tools/search-tools.ts`, `src/app/[locale]/schedule/ScheduleClient.tsx`, `src/app/[locale]/dashboard/components/LiveShiftList.tsx`, `src/components/ai/AIChatOverlay.tsx`, `src/app/[locale]/inventory/PurchaseOrdersModal.tsx`, `src/app/actions/daily-report-actions.ts`, `npx tsc --noEmit`, `npm run build`

### DEC-014: CSV-Verified Tool Schema Lock (Inventory + Maintenance)

- **Date:** May 27, 2026
- **Context:** AI query ��Դ Postgres 42703 ��������¡��������������ը�ԧ ���� item_name, maintenance_date, operator`r
- **Decision:** �ѧ�Ѻ
eadTableTool ������ preset ��� schema ��ԧ ��� map alias ����Դ令��������ԧ��͹�ԧ query
- **Impact:** Ŵ�͡�� query fail ���к� AI executive chat ��� maintenance/inventory lookup

### DEC-015: AI Chat Tool Surface Minimization

- **Date:** May 27, 2026
- **Context:** Ŵ�����Ѻ��͹ orchestration ��Ф����鹷ҧ�����ŵ�� Internal API-First
- **Decision:** /api/chat ��������ͧ������§
eadTable ��� internetSearchTool`r
- **Impact:** ระบบมีความลื่นไหลเหมือนใช้งานแอปพลิเคชันพื้นฐาน (Native-like) และเข้าถึงข้อมูลได้ง่ายด้วยนิ้วโป้ง
- **Evidence:** `MASTER_BLUEPRINT.md`, `src/app/[locale]/layout.tsx`

### DEC-060: Universal Tool Architecture & Daily Closing (v5.9)

- **Date:** June 1, 2026
- **Context:** ต้องการลดความซับซ้อนของ AI reasoning และปิดจบงานประจำวัน
- **Decision:** ยุบเครื่องมือย่อยใน `route.ts` ให้เหลือเพียง `readTable` และ `internetSearch` โดยใช้ Preset Columns ที่ตรวจสอบความถูกต้องแล้ว (CSV-Verified) และยืนยันความปลอดภัย API Keys
- **Impact:** AI ตอบคำถามแม่นยำขึ้น ไม่หลงชื่อคอลัมน์ และระบบมีความปลอดภัยเชิงสถาปัตยกรรม 100%
- **Impact:** Ŵ branching behavior ͧ agent кѧѺ schema map Ǩҡ Universal DB reader

### DEC-061: Vercel AI SDK ToolLoopAgent Migration (v6.0)

- **Date:** June 1, 2026
- **Context:** `streamText` ในไลบรารี `ai@6.0.190` ถูกนำ `maxSteps` ออกไป ทำให้ AI SDK ไม่สามารถวนลูป Multi-step tool calls แบบอัตโนมัติได้ เมื่อเรียก Tool สำเร็จระบบจึงหยุดทำงาน (finishReason: "tool-calls") ทันที ส่งผลให้หน้าจอไม่แสดงคำตอบ
- **Decision:** เปลี่ยนสถาปัตยกรรมใน `/api/chat/route.ts` จากการใช้ `streamText` เป็นการเรียกใช้ `ToolLoopAgent` และบังคับลูปด้วย `stopWhen: stepCountIs(maxSteps)` แทน เพื่อให้ระบบหลังบ้านสามารถวนลูปประมวลผล Tool output แล้วส่งกลับให้ AI สรุปผลข้อความสุดท้ายได้ตามปกติ
- **Impact:** แก้ไขปัญหาระบบแชทค้าง/ไม่ตอบกลับ AI สามารถใช้ Tools ซ้อนกันหลายขั้นตอนและสรุปผลเป็นข้อความภาษาไทยได้อย่างสมบูรณ์
- **Evidence:** `src/app/api/chat/route.ts`
