# Context — BLACKANDBREW ERP

> **Version:** 6.3 | **Last Updated:** 2026-06-04

---

## 1. Project Identity

| Field | Value |
| :--- | :--- |
| **Project Name** | BLACK-AND-BREW ERP System |
| **Type** | Enterprise Resource Planning for Coffee Shop |
| **Current Version** | 6.3 (Mobile & PWA Overhaul) |
| **Repository** | `Chachshawan2807/black-and-brew` |
| **Local Path** | `C:\Users\chach\.gemini\antigravity\scratch\black-and-brew` |

---

## 2. Business Context

**BLACK AND BREW** คือร้านกาแฟที่ดำเนินการโดยทีมพนักงาน 9 คน ระบบ ERP นี้ถูกสร้างขึ้นเพื่อจัดการ:

1. **ตารางงาน (Scheduling)** — จัดกะงานพนักงานแบบ Drag-and-Drop พร้อมรองรับการสลับกะ
2. **คลังสินค้า (Inventory)** — ติดตามสต็อก สั่งซื้ออัตโนมัติ พร้อมประวัติ transactions
3. **บำรุงรักษา (Maintenance)** — บันทึกสถานะอุปกรณ์

### Staff Roster (9 Persons)

นิต้า, ปิ่น, มุก, เม, มีนา, ชัช, หนูดี, ฟิว, ล่า

---

## 3. Environment

### Runtime

| Component | Version |
| :--- | :--- |
| Node.js | 22.x (npm 11.12) |
| Next.js | 16.2.4 |
| React | 19.2.4 |
| TypeScript | ^5 |
| Tailwind CSS | ^4 |
| Vitest | ^4.1.6 |

### Environment Variables (`.env.local`)

| Variable | Purpose | Visibility |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public (client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Public (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (bypass RLS) | **Server only** |
| `GOOGLE_API_KEY` | Google API key | Server only |
| `GOOGLE_CALENDAR_API_KEY` | Google Calendar API for holiday sync | Server only |

### Supabase Project

- **URL:** `https://yghzklvtuykziqlexnzh.supabase.co`
- **Region:** Thailand Edge
- **Database:** PostgreSQL with RLS enabled on all tables

---

## 4. Operational Constraints

| Constraint | Value |
| :--- | :--- |
| **Timezone** | GMT+7 (Bangkok) — Strict Enforcement |
| **Language** | Thai (primary), English (secondary) |
| **Deployment Target** | Vercel Edge Runtime |
| **Accessibility** | WCAG 2.2 AA |
| **Target INP** | < 200ms |
| **Font Weight** | `font-normal` only (no bold) |
| **Border Radius** | `rounded-3xl` (24px) everywhere |
| **Primary Background** | `#fdfcf0` (Morning Latte Cream) |
| **Primary Text** | `#000000` (Black) |

---

## 5. Key Dependencies

```json
{
  "@ai-sdk/google": "^3.0.79",
  "@ai-sdk/react": "^3.0.192",
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/modifiers": "^9.0.0",
  "@dnd-kit/sortable": "^10.0.0",
  "@dnd-kit/utilities": "^3.2.2",
  "@line/bot-sdk": "^11.0.0",
  "@supabase/supabase-js": "^2.105.1",
  "ai": "^6.0.190",
  "date-fns": "^4.1.0",
  "date-fns-tz": "^3.2.0",
  "framer-motion": "^12.38.0",
  "googleapis": "^172.0.0",
  "html-to-image": "^1.11.13",
  "lucide-react": "^1.16.0",
  "next": "16.2.4",
  "next-intl": "^4.11.0",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "recharts": "^3.8.1",
  "tailwind-merge": "^3.5.0",
  "xlsx": "^0.18.5",
  "zod": "^4.4.3",
  "zustand": "^5.0.13"
}
```

---

## 6. File Structure Overview

| Module | Path | Files |
| :--- | :--- | :--- |
| Dashboard | `src/app/[locale]/dashboard/` | `page.tsx`, `LiveShiftList.tsx`, `ShiftCard.tsx`, `LiveStatusTracker.tsx`, `MonthlyRoster.tsx`, `types.ts` |
| Schedule | `src/app/[locale]/schedule/` | `page.tsx`, `ScheduleClient.tsx` |
| Inventory | `src/app/[locale]/inventory/` | `page.tsx` (smart spreadsheet), `PurchaseOrdersModal.tsx`, `count/page.tsx` (physical stock count) |
| Maintenance | `src/app/[locale]/maintenance/` | `page.tsx` |
| Sales | `src/app/[locale]/sales/` | `page.tsx` (sales uploads & analysis) |
| Market Insights | `src/app/[locale]/market-insights/` | `page.tsx` (AI market/weather analysis) |
| Server Actions | `src/app/actions/` | `inventory-actions.ts`, `shift-actions.ts`, `holiday-actions.ts`, `sales-actions.ts`, `daily-report-actions.ts`, `market-insights-actions.ts` |
| Shared UI | `src/components/` | sidebar/, ui/, providers/, `PwaRegister.tsx` |
| Libraries | `src/lib/` | `supabase.ts`, `utils.ts`, `date-utils.ts`, `timezone.ts`, `menu-list.ts` |
| Agent Tools | `src/app/actions/tools/` | `database-tools.ts`, `search-tools.ts`, `internal-sources-tools.ts` |
