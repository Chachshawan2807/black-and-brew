# Context — BLACKANDBREW ERP

> Version: 8.5 | Last Updated: 2026-06-12

---

## 1. Project Identity

| Field | Value |
| --- | --- |
| **Project Name** | BLACK-AND-BREW ERP System |
| **Type** | Enterprise Resource Planning for Coffee Shop |
| **Current Version** | 8.5 (Security Audit + Inventory Notifications) |
| **Repository** | `Chachshawan2807/black-and-brew` |
| **Local Path** | `C:\Users\chach\.gemini\antigravity\scratch\black-and-brew` |

---

## 2. Business Context

**BLACK AND BREW** คือร้านกาแฟที่ดำเนินการโดยทีมพนักงาน 9 คน ระบบ ERP นี้ถูกสร้างขึ้นเพื่อจัดการ:

1. **ตารางงาน (Scheduling)** — จัดกะงานพนักงานแบบ Drag-and-Drop พร้อมรองรับการสลับกะ
2. **คลังสินค้า (Inventory)** — Single Source of Truth (`inventory_items.stock`), ตรวจนับ, สั่งซื้อตามช่องทาง
3. **ยอดขาย (Sales)** — อัปโหลด Excel วิเคราะห์ยอดขายและหมวดหมู่สินค้า
4. **วิเคราะห์ตลาด (Market Insights)** — AI วิเคราะห์เทรนด์ตลาดรอบร้าน
5. **บำรุงรักษา (Maintenance)** — บันทึกสถานะอุปกรณ์
6. **AI Assistant (บรู)** — แชท AI พร้อมเครื่องมือดึงข้อมูลร้าน
7. **การตั้งค่า (Settings)** — เลือกธีม (สว่าง/มืด/ตามระบบ), ประวัติการเข้าใช้, และการแจ้งเตือนคลังสินค้า

### Staff Roster (9 Persons)

นิต้า, ปิ่น, มุก, เม, มีนา, ชัช, หนูดี, ฟิว, ล่า

---

## 3. Environment

### Runtime

| Component | Version |
| --- | --- |
| Node.js | 22.x |
| Next.js | 16.2.4 |
| React | 19.2.4 |
| TypeScript | ^5 |
| Tailwind CSS | ^4 |
| next-themes | ^0.4 |
| Vitest | ^4.1.6 |

### Environment Variables

| Variable | Purpose | Visibility |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (bypass RLS) | Server only |
| `APP_PIN` | Full-access PIN | Server only |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini — AI Chat + Market Insights (`@ai-sdk/google`) | Server only |
| `GOOGLE_CALENDAR_API_KEY` | Thai holiday sync (OPTION) | Server only |
| `GOOGLE_PLACES_API_KEY` | Nearby competitor cafes - Market Insights v2 (OPTION) | Server only |
| `TAVILY_API_KEY` | AI web search | Server only |
| `OPENWEATHER_API_KEY` | Weather data | Server only |
| `NEXT_PUBLIC_STORE_LAT` / `NEXT_PUBLIC_STORE_LON` | Store coordinates | Public |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE push notifications | Server only |
| `LINE_GROUP_ID` | LINE cron recipient (checked before `LINE_TARGET_RECIPIENT_ID`) | Server only |
| `LINE_TARGET_RECIPIENT_ID` | LINE recipient fallback | Server only |
| `CRON_SECRET` | Vercel cron auth | Server only |

Read-only PIN `111222` is hardcoded in `src/lib/auth-constants.ts` — not an env var.

Authoritative env list: [`.env.example`](../.env.example)

### Supabase Project

- **Region:** Thailand Edge
- **Database:** PostgreSQL with RLS enabled
- **Client types:** `src/lib/database.types.ts`

---

## 4. Authentication

| Mode | PIN | Capabilities |
| --- | --- | --- |
| Full access | `APP_PIN` (env) | Read + write ทุกโมดูล |
| Read-only | `111222` (hardcoded) | ดูอย่างเดียว — `assertWritableSession()` บล็อก writes |

- Client gate: `sessionStorage` + `PinGateway.tsx`
- Server session: httpOnly cookies `bb_auth_pin_verified`, `bb_auth_read_only`
- Post-PIN: `ensureSupabaseSession()` → anonymous auth สำหรับ RLS `authenticated`
- Session fingerprint: cookie `bb_session_fp` + `revoked_sessions` table สำหรับ remote sign-out
- Login events: `login_history` (service-role write) แสดงใน Settings

---

## 5. Operational Constraints

| Constraint | Value |
| --- | --- |
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

## 6. Key Dependencies

```json
{
  "@ai-sdk/google": "^3.0.79",
  "@ai-sdk/react": "^3.0.192",
  "@dnd-kit/core": "^6.3.1",
  "@line/bot-sdk": "^11.0.0",
  "@supabase/supabase-js": "^2.105.1",
  "ai": "^6.0.190",
  "framer-motion": "^12.38.0",
  "next": "16.2.4",
  "next-intl": "^4.11.0",
  "react": "19.2.4",
  "recharts": "^3.8.1",
  "xlsx": "^0.18.5",
  "zod": "^4.4.3",
  "zustand": "^5.0.13"
}
```

---

## 7. File Structure Overview

| Module | Path |
| --- | --- |
| Command Center | `src/app/[locale]/page.tsx` |
| Dashboard | `src/app/[locale]/dashboard/` |
| Schedule | `src/app/[locale]/schedule/` |
| Inventory | `src/app/[locale]/inventory/` + `count/page.tsx` |
| Maintenance | `src/app/[locale]/maintenance/` |
| Sales | `src/app/[locale]/sales/` |
| Market Insights | `src/app/[locale]/market-insights/` |
| Auth | `src/components/auth/PinGateway.tsx`, `src/app/actions/auth.ts` |
| AI Chat | `src/components/ai/`, `src/app/api/chat/route.ts` |
| i18n Middleware | `src/proxy.ts` (next-intl, Next.js 16 convention) |
| Server Actions | `src/app/actions/` |
| Agent Tools | `src/app/actions/tools/` |
