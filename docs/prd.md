# PRD — BLACKANDBREW ERP System

> **Version:** 6.3 | **Last Updated:** 2026-06-04 | **Owner:** System Architect

---

## 1. Vision & Mission

**BLACKANDBREW ERP** คือระบบจัดการทรัพยากรองค์กร (Enterprise Resource Planning) สำหรับร้านกาแฟ BLACK AND BREW ออกแบบมาเพื่อ **Revenue Stabilization** — ลดการสูญเสียรายได้จากการจัดการที่ไม่เป็นระบบ โดยรวมศูนย์การจัดการตารางงานพนักงาน, คลังสินค้า, และบำรุงรักษาอุปกรณ์ไว้ในแพลตฟอร์มเดียว

### Core Objective

- ลดเวลาในการจัดตารางงานจาก **หลายชั่วโมง → นาที** ผ่าน Drag-to-Shift UI
- ป้องกัน **สินค้าขาดสต็อก** ผ่านระบบ Computed Auto-Ordering (`order_qty = target_stock - stock`)
- เพิ่ม **ความโปร่งใส** ด้วย Real-time Sync และ Transaction Ledger

---

## 2. Target Users

| บทบาท | จำนวน | สิทธิ์การใช้งาน |
| :--- | :--- | :--- |
| **Owner / Manager** | 1-2 คน | Full Access ทุกโมดูล |
| **Staff** | 9 คน (นิต้า, ปิ่น, มุก, เม, มีนา, ชัช, หนูดี, ฟิว, ล่า) | Dashboard, Schedule |

---

## 3. Core Modules

### 3.1 Dashboard (Command Center)

- **Route:** `/[locale]/dashboard/`
- **Purpose:** ภาพรวมกะงานวันนี้ ดูรายชื่อพนักงานที่ปฏิบัติงาน
- **Components:** `LiveShiftList.tsx`, `ShiftCard.tsx`
- **Data Source:** `shifts` table + `profiles` table (Real-time via Supabase Channel)

### 3.2 Schedule (Shift Management)

- **Route:** `/[locale]/schedule/`
- **Purpose:** จัดตารางงานพนักงาน, สลับกะ, ลากะงาน
- **Components:** `ScheduleClient.tsx` (51.6 KB — Full-featured Client Component)
- **Key Features:**
  - Drag-and-Drop Shift Assignment
  - Status Management: `scheduled`, `completed`, `swapped`, `cancelled`, `on_leave`
  - Thai Holiday Integration via Google Calendar API
  - Optimistic UI with immediate state updates

### 3.3 Inventory (Smart Inventory Management)

- **Route:** `/[locale]/inventory/`
- **Purpose:** จัดการคลังสินค้า, ติดตามยอดสต็อก, สั่งซื้ออัตโนมัติ
- **Components:** `DynamicInventoryManager` (1,358 lines)
- **Key Features:**
  - Spreadsheet-style Inline Editing (Google Sheets Logic)
  - Drag-and-Drop Row Reordering via `@dnd-kit`
  - Undo/Redo with Full State Persistence (`syncFullStateToDB`)
  - Quick Entry for Stock In/Out Transactions
  - Computed Auto-Ordering: `order_qty = target_stock - stock` (when `stock <= order_point`)
  - Transaction History with Two-Step Fetch Strategy
  - Purchase Order Modal with Source Tabs
  - Dynamic Column Labels via `inventory_config` table
  - Real-time Cross-device Sync via Supabase Channels

### 3.4 Maintenance (Equipment Tracking)

- **Route:** `/[locale]/maintenance/`
- **Purpose:** บันทึกและติดตามสถานะการซ่อมบำรุงอุปกรณ์
- **Components:** `page.tsx` (31.2 KB)

---

## 4. Revenue Stabilization Features

| Feature | Revenue Impact | Module |
| :--- | :--- | :--- |
| **Auto-Ordering** | ป้องกันสินค้าขาดสต็อก → ไม่สูญเสียรายได้จากการขาดวัตถุดิบ | Inventory |
| **Transaction Ledger** | ตรวจสอบความถูกต้องของสต็อก → ลดการสูญหาย | Inventory |
| **Shift Scheduling** | จัดพนักงานให้เหมาะสม → ไม่ขาดคน/ไม่เกินจำเป็น | Schedule |
| **Holiday Sync** | วางแผนล่วงหน้าตามวันหยุดราชการ → เตรียมพนักงานสำรอง | Schedule |
| **Real-time Sync** | ข้อมูลอัปเดตทันทีข้ามเครื่อง → ลดความผิดพลาดจากข้อมูลเก่า | All |

---

## 5. Technical Constraints

| Constraint | Value |
| :--- | :--- |
| **Tech Stack** | Next.js 16.2.4, React 19.2.4, Supabase, Tailwind CSS 4 |
| **Timezone** | GMT+7 (Bangkok) — Strict Enforcement |
| **Deployment** | Vercel Edge Runtime |
| **i18n** | Thai (primary), English — via `next-intl` |
| **State Management** | Zustand for global state, React useState for local |
| **PWA Compliance** | Standalone mode with Web App Manifest & Network-First Service Worker |
| **Target INP** | < 200ms (Core Web Vitals 2026) |

---

## 6. Non-Functional Requirements

- **Accessibility:** WCAG 2.2 AA Compliance (Contrast Ratio: Black text on light pastel backgrounds) & Full-width clickable hitboxes for all Date Pickers
- **Security:** RLS enabled on all tables; Service Role Key used only in Server Actions; never exposed to browser
- **Performance:** Hybrid PPR rendering (Static Shell + Dynamic Islands) with Network-First Service Worker caching
- **Reliability:** Optimistic UI with Rollback on failure; Atomic transactions via PostgreSQL RPC; iOS Safe Zone (Home Indicator) compliance for mobile buttons and menus
