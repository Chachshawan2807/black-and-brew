# PRD — BLACKANDBREW ERP System

> Version: 9.0 | Last Updated: 2026-06-22 | Owner: System Architect

---

## 1. Vision & Mission

BLACKANDBREW ERP คือระบบจัดการทรัพยากรองค์กรสำหรับร้านกาแฟ BLACK AND BREW ออกแบบมาเพื่อ Revenue Stabilization — ลดการสูญเสียรายได้จากการจัดการที่ไม่เป็นระบบ

### Core Objective

- ลดเวลาในการจัดตารางงานผ่าน Drag-to-Shift UI
- ป้องกันสินค้าขาดสต็อกผ่าน Computed Auto-Ordering สำหรับสินค้านับจริง และ manual `order_qty` สำหรับรายการเช็คว่าพอใช้
- เพิ่มความโปร่งใสด้วย Real-time Sync และ Transaction Ledger
- วิเคราะห์ยอดขายและตลาดด้วย AI

---

## 2. Target Users

| บทบาท | จำนวน | สิทธิ์การใช้งาน |
| --- | :--- | --- |
| Owner / Manager | 1-2 คน | Full Access (APP_PIN) |
| Staff | 9 คน | Dashboard, Schedule; Read-only PIN available |
| Read-only | — | `APP_READ_ONLY_PIN` — ดูอย่างเดียว (dev fallback `111222`) |

พนักงาน: นิต้า, ปิ่น, มุก, เม, มีนา, ชัช, หนูดี, ฟิว, ล่า

---

## 3. Core Modules

### 3.1 Command Center

- Route: `/[locale]`
- Purpose: ภาพรวมกะงานวันนี้/พรุ่งนี้แบบเรียลไทม์
- Components: `LiveStatusTracker`, `CommandCenterGrid`

### 3.2 Staff Dashboard

- Route: `/[locale]/dashboard`
- Purpose: ลงเวลา รายชื่อกะ ตารางรายเดือน
- Components: `LiveShiftList`, `ShiftCard`, `MonthlyRoster`, `InventorySummaryCard`, `WeatherWidget`
- Performance: รวม query กะรายสัปดาห์/รายเดือนเมื่อช่วงวันที่ซ้อนกัน แล้ว split กลับเป็น payload เดิม

### 3.3 Schedule

- Route: `/[locale]/schedule`
- Purpose: จัดตารางงาน Drag-and-Drop, สลับกะ, วันหยุด
- Components: `ScheduleClient.tsx`
- Features: DnD shift assignment, Thai holidays (Google Calendar), regular holidays, PNG export

### 3.4 Inventory

- Route: `/[locale]/inventory`, `/[locale]/inventory/count`, `/[locale]/inventory/accuracy`
- Purpose: คลังสินค้า + ตรวจนับสต็อก
- Components: `page.tsx`, `PurchaseOrdersModal.tsx`, `count/page.tsx`
- Features:
  - Spreadsheet inline editing + Undo/Redo
  - DnD row reordering (`@dnd-kit`)
  - Stock single source of truth (RPC `set_inventory_stock`)
  - Count policy: `exact_count` คิดรวม accuracy; `sufficiency_check` ไม่คิดรวมคะแนนและใช้ `order_qty` manual
  - Quick Entry IN/OUT + bulk quick action (`recordBulkInventoryTransactions`)
  - Transaction History + count accuracy verification/report (system stock baseline via `system_stock_qty`)
  - Purchase Order modal with channel tabs + PNG export
  - Real-time cross-device sync via `InventoryRealtimeContext`
  - Long-grid responsiveness via row containment and dynamic modal loading

### 3.5 Maintenance

- Route: `/[locale]/maintenance`
- Purpose: บันทึกการซ่อมบำรุงอุปกรณ์
- Table: `service_records`

### 3.6 Sales

- Route: `/[locale]/sales`
- Purpose: อัปโหลด Excel วิเคราะห์ยอดขาย
- Features: File upload, category management, AI auto-categorize, charts (`recharts`)

### 3.7 Market Insights

- Route: `/[locale]/market-insights`
- Purpose: วิเคราะห์ตลาดรอบร้านด้วย Gemini AI (v2 multi-step pipeline)
- Features: Zod-validated output, ContextPanel/AlertsCard/ActionChecklist, localStorage cache v2, optional Google Places competitors, store-managed local events context

### 3.8 AI Assistant (บรู)

- Route: Global overlay (ทุกหน้า)
- Purpose: แชท AI พร้อมเครื่องมือดึงข้อมูลร้าน
- API: `POST /api/chat` — ToolLoopAgent + Gemini 2.5 Flash

### 3.9 Settings

- Route: `/[locale]/settings`
- Purpose: การตั้งค่าระบบสำหรับพนักงาน
- Features: Theme picker (light / dark / system via `next-themes`, key `bb-theme`); login history; trusted-device passkeys; notification preferences; data change history (`DataChangeHistorySection`)

### 3.10 Daily Web Push Notification

- Route: `/api/daily-report` (Vercel Cron)
- Purpose: แจ้งเตือนกะงาน อากาศ และวันหยุดผ่าน Web Push ตาม `push_subscriptions.branch_id` / `profile_id`

---

## 4. Revenue Stabilization Features

| Feature | Revenue Impact | Module |
| --- | :--- | --- |
| Auto-Ordering | ป้องกันสินค้าขาดสต็อก | Inventory |
| Transaction Ledger | ตรวจสอบความถูกต้องของสต็อก | Inventory |
| Shift Scheduling | จัดพนักงานให้เหมาะสม | Schedule |
| Holiday Sync | วางแผนล่วงหน้าตามวันหยุดราชการ | Schedule |
| Sales Analytics | วิเคราะห์ยอดขายและหมวดหมู่ | Sales |
| Market Insights | ตอบรับเทรนด์ตลาด | Market Insights |
| Real-time Sync | ข้อมูลอัปเดตทันทีข้ามเครื่อง | All |
| Daily Web Push | แจ้งเตือนตารางงานผ่าน endpoint เดียวกับ inventory alerts | Schedule/Notifications |
| Trusted-device Passkeys | ลด friction หลัง PIN verified โดยยังคุม device fingerprint | Settings/Auth |

---

## 5. Technical Constraints

| Constraint | Value |
| --- | :--- |
| Tech Stack | Next.js 16.2.4, React 19.2.4, Supabase, Tailwind CSS 4 |
| Timezone | GMT+7 (Bangkok) |
| Deployment | Vercel App Router on Vercel; runtime selected per route/API |
| i18n | Thai (primary), English — `next-intl` |
| Auth | PIN Gateway + read-only mode + trusted-device passkeys |
| PWA | Manifest + Network-First Service Worker |
| Target INP | < 200ms |

---

## 6. Non-Functional Requirements

- Accessibility: WCAG 2.2 AA; full-width clickable date pickers
- Security: RLS + PIN auth + WebAuthn passkeys; Service Role Key server-only; XSS sanitization in AI chat
- Performance: Hybrid PPR; explicit field selection in Supabase queries; dynamic route/modal chunks for heavy client-only UI
- Reliability: Optimistic UI with rollback; atomic RPC transactions
- Design: Zero-Bold Policy; `rounded-3xl`; theme-token page/modal surfaces; pastel accent cards use `bb-pastel-surface`
