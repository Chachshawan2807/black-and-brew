# Context — BLACKANDBREW ERP

> **Version:** 3.1 | **Last Updated:** 2026-05-15

---

## 1. Project Identity

| Field | Value |
| :--- | :--- |
| **Project Name** | BLACK-AND-BREW ERP System |
| **Type** | Enterprise Resource Planning for Coffee Shop |
| **Current Version** | 3.1 (System Rebirth) |
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
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@supabase/supabase-js": "^2.105.1",
  "date-fns": "^4.1.0",
  "date-fns-tz": "^3.2.0",
  "lucide-react": "^1.14.0",
  "next": "16.2.4",
  "next-intl": "^4.11.0",
  "react": "19.2.4",
  "tailwind-merge": "^3.5.0",
  "zod": "^4.4.3",
  "zustand": "^5.0.13"
}
```

---

## 6. File Structure Overview

| Module | Path | Files |
| :--- | :--- | :--- |
| Dashboard | `src/app/[locale]/dashboard/` | `page.tsx`, `LiveShiftList.tsx`, `ShiftCard.tsx`, `types.ts` |
| Schedule | `src/app/[locale]/schedule/` | `page.tsx`, `ScheduleClient.tsx` |
| Inventory | `src/app/[locale]/inventory/` | `page.tsx` (1,358 lines) |
| Maintenance | `src/app/[locale]/maintenance/` | `page.tsx` |
| Server Actions | `src/app/actions/` | `inventory-actions.ts`, `shift-actions.ts`, `holiday-actions.ts` |
| Shared UI | `src/components/` | sidebar/, ui/, providers/ |
| Libraries | `src/lib/` | `supabase.ts`, `utils.ts`, `date-utils.ts`, `timezone.ts`, `menu-list.ts` |
| Agent Tools | `src/lib/agent-tools/` | `fs_tool.ts`, `shell_tool.ts`, `search_proxy.ts` |
