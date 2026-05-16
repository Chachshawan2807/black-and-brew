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
