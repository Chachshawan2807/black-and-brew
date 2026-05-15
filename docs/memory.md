# Memory Log — BLACKANDBREW ERP

> **Purpose:** บันทึกการตัดสินใจเชิงสถาปัตยกรรมที่สำคัญ เพื่อป้องกันการทำผิดซ้ำ

---

## Decision Log

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
- **Decision:** Financial/Stock transactions MUST NEVER use UI Undo/Redo stack. ต้องแก้ผ่าน compensating transaction หรือลบใน History ledger
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
