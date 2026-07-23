# Design: AI บรู — ครอบคลุมข้อมูล ERP ทั้งหมด ตอบเร็ว สไตล์รายงานสั้น

> วันที่: 2026-07-23 · สถานะ: implemented · โมดูล: `/api/chat` + AI Data Gateway

---

## 1. เป้าหมาย

ให้ AI ผู้ช่วย **"บรู"** ตอบคำถามข้อมูลปฏิบัติการใน ERP และ Supabase ได้ครบทุกโดเมนหลัก อย่างรวดเร็ว ในลักษณะผู้หญิง รายงานสั้น กระชับ แต่ใจความครบ

**ขอบเขต:** ข้อมูลปฏิบัติการเท่านั้น (ไม่รวม how-to UI / ความรู้เชิงเทคนิคโค้ด)

---

## 2. สถาปัตยกรรม: Hybrid Router

| Path | เมื่อไหร่ | Latency | Token |
|------|----------|---------|-------|
| Hot — Deterministic | คำถามเดี่ยวโดเมนชัด (ยอดนิยม) | ~100–400ms | 0 LLM |
| Warm — Specialized tools | LLM + aggregator tools | ปานกลาง | ต่ำ |
| Cold — readTable | คำถามซับซ้อนข้ามโดเมน | สูงกว่า | สูงกว่า |

Intent scoring: `src/lib/agents/intent/classify-intent.ts`  
Short-circuit เมื่อโดเมนนั้นเป็นคะแนนสูงสุด (≥ threshold) และ detector เฉพาะโดเมนผ่าน

### Deterministic domains

- schedule, maintenance (เดิม)
- sales, holidays, low-stock, store status, bean orders, inventory accuracy (ใหม่)

### Specialized tools

- `getSalesSummary`, `getInventoryLedger`, `getStoreStatus`, `getBeanOrdersSummary`
- คง `getDailyShifts`, `readTable`, `internetSearchTool`

---

## 3. Bru Report Style

Module: `src/lib/agents/report-response.ts`

- ลงท้าย "ค่ะ" / "นะคะ" เท่านั้น
- หัวข้อ → bullet `-` → สรุปจำนวนท้าย
- ห้าม `**`, ตาราง markdown, UUID
- วันที่ DD-MM-YYYY
- Hyper-concise (~15 บรรทัด)

---

## 4. Gateway — bean orders

เพิ่ม 6 ตารางใน `AI_ALLOWED_TABLES` (รวม 24):

`bean_customers`, `bean_customer_addresses`, `bean_orders`, `bean_order_lines`, `bean_order_payments`, `bean_order_shipments`

Presets ไม่รวม `slip_url`, ที่อยู่เต็มบางส่วน, `tracking_raw`

ฟังก์ชันใหม่: `fetchBeanOrdersSummary`, `fetchInventoryAccuracySummary`

---

## 5. Testing

- `src/test/ai-report-formatter.test.ts`
- `src/test/ai-intent-classifier.test.ts`
- `src/test/ai-bean-orders-gateway.test.ts`
- `src/test/ai-deterministic-routes.test.ts`
- `src/test/ai-data-gateway.test.ts` (24 tables)

---

## 6. นอก scope

- clientContext / screen scraping
- คำถามวิธีใช้งานหน้าจอ
- ความรู้สถาปัตยกรรมโค้ด
