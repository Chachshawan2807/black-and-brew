# Design: ระบบคำสั่งซื้อเมล็ดกาแฟ

> วันที่: 2026-07-22 · สถานะ: อนุมัติแล้ว · โมดูล: `/[locale]/bean-orders`

---

## 1. ภาพรวม

โมดูลใหม่ใน Sidebar ชื่อ **"คำสั่งซื้อเมล็ดกาแฟ"** ให้พนักงานรับออเดอร์แทนลูกค้า (โทร / LINE / หน้าร้าน) — ไม่มีหน้าสั่งซื้อสาธารณะ

**เป้าหมายหลัก**

- รับออเดอร์เมล็ดกาแฟ (กรัม/กิโลกรัม)
- จัดการผู้ส่ง / ผู้รับ (กำหนดแยกต่อออเดอร์ได้)
- คำนวณเงิน (สินค้า + ค่าส่ง − ส่วนลด)
- ตรวจสลิปชำระเงิน (อัปโหลดรูป → พนักงานยืนยัน)
- จัดส่ง + ติดตามพัสดุผ่าน TrackingMore (ถ้ามีเลขพัสดุ)
- ตรวจสอบย้อนหลังได้ทั้งหมด

**แนวทางที่เลือก:** โมดูลเดียว (`/bean-orders`) ตาม pattern ERP ปัจจุบัน — ส่ง v1 เร็ว ไม่ over-engineer

---

## 2. สินค้า & ราคา

| หัวข้อ | รายละเอียด |
|--------|------------|
| แหล่งสินค้า | เลือกจาก `inventory_items` (ชื่ออ้างอิงเท่านั้น) |
| หน่วยขาย | กรัม / กิโลกรัม |
| หน่วยคลัง | กล่อง — **ไม่เชื่อมกับออเดอร์** |
| ตัดสต็อก | **ไม่ทำ** — พนักงานคีย์นำออกคลังเองรายวัน |
| ราคา/กก. | พนักงานกรอกเองทุกออเดอร์ |
| ค่าส่ง | พนักงานกรอกเอง |
| ส่วนลด | จำนวนเงิน (บาท) ระดับออเดอร์ |
| รายการ | หลายรายการต่อออเดอร์ได้ |

**สูตรคำนวณ**

```
ราคารายการ = น้ำหนัก(กก.) × ราคา/กก.
ยอดรวม     = รวมรายการ − ส่วนลด + ค่าส่ง
```

แปลงกรัม → กก. อัตโนมัติ (500 ก. = 0.5 กก.)

---

## 3. ลูกค้า & ที่อยู่

- เก็บ **ลูกค้า + ที่อยู่หลายที่** ไว้ใช้ซ้ำ
- แต่ละออเดอร์กำหนด **ผู้ส่ง** และ **ผู้รับ** แยกกันได้ (ไม่ต้องตรงกับที่อยู่ที่บันทึกไว้)
- รองรับกรณีลูกค้าสั่งในนามอื่น ไม่ใช่ชื่อร้าน
- ค่าเริ่มต้นผู้ส่ง = ข้อมูลร้าน แก้ได้ทุกออเดอร์

---

## 4. สถานะออเดอร์

ใช้ **2 แกนอิสระ** รองรับทั้งชำระก่อนและจัดส่งก่อน:

| `payment_status` | `fulfillment_status` | แสดงใน UI |
|------------------|----------------------|-----------|
| unpaid | pending | รอชำระ |
| paid | pending | ชำระแล้ว · รอจัดส่ง |
| unpaid | shipped | จัดส่งแล้ว · รอชำระ |
| paid | shipped | เสร็จสมบูรณ์ |

**Flow ที่รองรับ**

```
ชำระก่อน:  สร้าง → อัปสลิป+ยืนยัน → จัดส่ง
จัดส่งก่อน: สร้าง → จัดส่ง → อัปสลิป+ยืนยัน
```

**กฎ**

- ยกเลิกได้ก่อน `fulfillment_status` → `shipped` (ตั้ง `cancelled_at`)
- แก้ไขรายการ/ราคาได้เฉพาะก่อนจัดส่ง
- อัปโหลดสลิปได้เมื่อ `payment_status = unpaid`
- ยืนยันชำระ → `payment_status = paid` (ไม่ขึ้นกับจัดส่งแล้วหรือยัง)
- เลขพัสดุใส่ตอนจัดส่ง — **ไม่บังคับ** (เช่น Lalamove)

---

## 5. ฐานข้อมูล (Supabase)

### ตาราง

| ตาราง | เก็บอะไร |
|-------|---------|
| `bean_customers` | ชื่อ, เบอร์, หมายเหตุ |
| `bean_customer_addresses` | ที่อยู่ลูกค้า (หลายที่ต่อคน) |
| `bean_orders` | ออเดอร์, snapshot ผู้ส่ง/ผู้รับ, เงิน, สถานะ 2 แกน, `status_history` |
| `bean_order_lines` | รายการ: สินค้า, น้ำหนัก, หน่วย, ราคา/กก., ยอดรายการ |
| `bean_order_payments` | สลิป URL, ผู้อัปโหลด, ผู้ยืนยัน, เวลายืนยัน |
| `bean_order_shipments` | ประเภทจัดส่ง, carrier, เลขพัสดุ, สถานะ tracking |

### คอลัมน์สำคัญ `bean_orders`

```sql
order_no            TEXT NOT NULL UNIQUE,       -- BO-YYYYMMDD-XXX
customer_id         UUID REFERENCES bean_customers,
-- snapshot ผู้ส่ง/ผู้รับ (เก็บค่าตอนสร้างออเดอร์)
sender_name         TEXT, sender_phone TEXT, sender_address TEXT,
recipient_name      TEXT, recipient_phone TEXT, recipient_address TEXT,
recipient_province  TEXT, recipient_postal_code TEXT,
subtotal_baht       NUMERIC, discount_baht NUMERIC, shipping_baht NUMERIC, total_baht NUMERIC,
payment_status      TEXT CHECK (payment_status IN ('unpaid','paid')),
fulfillment_status  TEXT CHECK (fulfillment_status IN ('pending','shipped')),
status_history      JSONB DEFAULT '[]',
cancelled_at        TIMESTAMPTZ, cancelled_by TEXT,
notes               TEXT,
created_by          TEXT, created_at TIMESTAMPTZ
```

### Storage

- Bucket: `bean-order-slips`
- Path: `{order_id}/{timestamp}.jpg`

### Env

- `TRACKINGMORE_API_KEY` (server-only)

---

## 6. โครงสร้างไฟล์

```
src/app/[locale]/bean-orders/
  page.tsx, new/page.tsx, [id]/page.tsx
  BeanOrdersClient.tsx, BeanOrderFormClient.tsx, BeanOrderDetailClient.tsx
  _components/  (OrderLineEditor, CustomerPicker, AddressFields,
                 PaymentSlipSection, ShipmentSection, OrderTimeline, OrderStatusBadge)

src/app/actions/bean-order-actions.ts
src/lib/bean-orders/  (pricing.ts, order-status.ts, trackingmore.ts)
src/app/api/bean-orders/
  tracking-webhook/route.ts
  sync-tracking/route.ts
```

เพิ่มเมนู Sidebar ในกลุ่ม "การจัดการ" · เพิ่ม module `bean_orders` ใน `data-change-log`

---

## 7. หน้าจอ & Flow

### 7.1 รายการออเดอร์ (`/bean-orders`)

ตาราง: เลขออเดอร์ · ลูกค้า · ผู้รับ · ยอดรวม · สถานะ · วันที่

กรอง: สถานะชำระ / จัดส่ง / ช่วงวันที่ / ค้นหาชื่อ-เบอร์ · ปุ่ม **+ สร้างออเดอร์**

### 7.2 สร้าง/แก้ไขออเดอร์

| ส่วนฟอร์ม | เนื้อหา |
|-----------|---------|
| ลูกค้า | ค้นหา/สร้างใหม่ · เลือกที่อยู่บันทึกไว้ (optional) |
| ผู้ส่ง | ชื่อ · เบอร์ · ที่อยู่ (default = ร้าน) |
| ผู้รับ | ชื่อ · เบอร์ · ที่อยู่ · จังหวัด · รหัสไปรษณีย์ |
| รายการ | สินค้าจากคลัง · น้ำหนัก · ราคา/กก. |
| สรุป | ส่วนลด · ค่าส่ง · ยอดรวม · หมายเหตุ |

บันทึก → `unpaid / pending`

### 7.3 รายละเอียดออเดอร์ (`/bean-orders/[id]`)

แสดงข้อมูลทั้งหมด + 4 โซน action:

1. **ชำระเงิน** — อัปโหลดสลิป · ยืนยันชำระ
2. **จัดส่ง** — ประเภท (พัสดี/ส่งในวัน) · ขนส่ง · เลขพัสดุ (optional) · บันทึกจัดส่ง
3. **ติดตามพัสดุ** — สถานะจาก TrackingMore (ถ้ามีเลข)
4. **ประวัติ** — timeline จาก `status_history`

### ปุ่มตามสถานะ

| สถานะ | ปุ่มที่ใช้ได้ |
|-------|-------------|
| รอชำระ | อัปสลิป · ยืนยันชำระ · จัดส่ง · แก้ไข · ยกเลิก |
| ชำระแล้ว·รอจัดส่ง | จัดส่ง · แก้ไขหมายเหตุ |
| จัดส่งแล้ว·รอชำระ | อัปสลิป · ยืนยันชำระ |
| เสร็จสมบูรณ์ | ดูอย่างเดียว |
| ยกเลิกแล้ว | ดูอย่างเดียว |

---

## 8. ชำระเงิน (สลิป)

1. อัปโหลดรูปสลิป → Supabase Storage
2. แสดง preview ในหน้ารายละเอียด
3. พนักงานกด **ยืนยันชำระแล้ว** → `payment_status = paid`
4. อัปโหลดทับได้ถ้ายังไม่ยืนยัน
5. ไม่มี API ธนาคาร · ไม่กรอกจำนวนเงิน/เวลาโอนแยก

---

## 9. จัดส่ง & TrackingMore

### จัดส่ง

- ประเภท: `parcel` (พัสดี) / `same_day` (ส่งในวัน เช่น Lalamove)
- ขนส่ง: dropdown carrier ที่ TrackingMore รองรับ
- เลขพัสดุ: optional สำหรับ `same_day`
- บันทึก → `fulfillment_status = shipped`

### TrackingMore

| จุด | การทำงาน |
|-----|----------|
| ตอนจัดส่ง (มีเลข) | `POST /trackings/create` ลงทะเบียนเลขพัสดุ |
| Webhook | รับ event → อัปเดต `tracking_status` |
| Sync (backup) | cron/manual ดึงสถานะออเดอร์ที่ยังไม่ส่งสำเร็จ |
| ไม่มีเลข | ข้าม TrackingMore — แสดง "ไม่มีเลขติดตาม" |

---

## 10. Audit Trail

| ชั้น | ใช้ทำอะไร |
|------|----------|
| `status_history` ในออเดอร์ | timeline สั้นในหน้ารายละเอียด |
| `data_change_logs` (module: `bean_orders`) | audit เต็ม: ใคร · ทำอะไร · เมื่อไหร่ · ค่าเก่า/ใหม่ |

---

## 11. สิทธิ์ & UI

| สิทธิ์ | ทำได้ |
|-------|-------|
| Admin (full) | สร้าง · แก้ไข · อัปสลิป · ยืนยัน · จัดส่ง · ยกเลิก |
| Read-only (PIN) | ดูอย่างเดียว |

- Theme tokens: `bg-background`, `bg-card`
- สถานะ: pastel badge + `bb-pastel-surface`
- เลขออเดอร์: `BO-YYYYMMDD-XXX`
- Mobile-first, safe-area, ปุ่มกดง่าย

---

## 12. Error Handling

- Supabase: try/catch + log รายละเอียด
- อัปสลิปล้มเหลว → แจ้งเตือน ไม่เปลี่ยนสถานะ
- TrackingMore ล้มเหลว → จัดส่งสำเร็จอยู่ดี แจ้งให้ลองติดตามใหม่ภายหลัง
- ข้อมูลว่าง → fallback ไม่ให้ UI พัง

---

## 13. นอกขอบเขต v1

- หน้าสั่งซื้อสาธารณะ (ลูกค้าสั่งเอง)
- ตัดสต็อกอัตโนมัติจากออเดอร์
- ตรวจสลิปอัตโนมัติ (API ธนาคาร)
- ตารางราคาค่าส่งอัตโนมัติ
- แปลงกล่อง ↔ กรัมอัตโนมัติ
