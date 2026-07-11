# Context — BLACKANDBREW ERP

> Version: 9.2 | Last Updated: 2026-07-12

---

## 1. Project Identity

| Field | Value |
| --- | --- |
| Project Name | BLACK-AND-BREW ERP System |
| Type | Enterprise Resource Planning for Coffee Shop |
| Current Version | 9.2 (branch withdraw + notification badge counter + accuracy gauge) |
| Repository | `Chachshawan2807/black-and-brew` |
| Local Path | `C:\Users\chach\.gemini\antigravity\scratch\black-and-brew` |

---

## 2. Business Context

BLACK AND BREW คือร้านกาแฟที่ดำเนินการโดยทีมพนักงาน 9 คน ระบบ ERP นี้ถูกสร้างขึ้นเพื่อจัดการ:

1. ตารางงาน (Scheduling) — จัดกะงานพนักงานแบบ Drag-and-Drop พร้อมรองรับการสลับกะ
2. คลังสินค้า (Inventory) — Single Source of Truth (`inventory_items.stock`), ตรวจนับ, สั่งซื้อตามช่องทาง
3. ยอดขาย (Sales) — อัปโหลด Excel วิเคราะห์ยอดขายและหมวดหมู่สินค้า
4. บำรุงรักษา (Maintenance) — บันทึกสถานะอุปกรณ์
5. AI Assistant (บรู) — แชท AI พร้อมเครื่องมือดึงข้อมูลร้าน
6. การตั้งค่า (Settings) — เลือกธีม, ประวัติการเข้าใช้, trusted-device passkeys, และการแจ้งเตือนคลังสินค้า

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
| `APP_READ_ONLY_PIN` | Read-only PIN; required in production; dev fallback `111222` | Server only |
| `WEBAUTHN_RP_ID` | WebAuthn relying-party ID override for production passkeys | Server only |
| `WEBAUTHN_ORIGIN` | WebAuthn origin override for production passkeys | Server only |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini — AI Chat (`@ai-sdk/google`) | Server only |
| `GOOGLE_CALENDAR_API_KEY` | Thai holiday sync (OPTION) | Server only |
| `TAVILY_API_KEY` | AI web search | Server only |
| `NEXT_PUBLIC_STORE_LAT` / `NEXT_PUBLIC_STORE_LON` | Store coordinates | Public |
| `CRON_SECRET` | Vercel cron auth | Server only |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push VAPID public key | Public |
| `VAPID_PRIVATE_KEY` | Web Push server signing key | Server only |
| `VAPID_SUBJECT` | Push service contact URI | Server only |
| `PUSH_WEBHOOK_SECRET` | OPTION — `POST /api/push/webhook` auth | Server only |

Authoritative env list: [`.env.example`](../.env.example)

### Supabase Project

- Region: Thailand Edge
- Database: PostgreSQL with RLS enabled
- Client types: `src/lib/database.types.ts`

---

## 4. Authentication

| Mode | PIN | Capabilities |
| --- | --- | --- |
| Full access | `APP_PIN` (env) | Read + write ทุกโมดูล |
| Read-only | `APP_READ_ONLY_PIN` (env; dev fallback `111222`) | ดูอย่างเดียว — `assertWritableSession()` บล็อก writes |

- Client gate: `sessionStorage` + `PinGateway.tsx`
- Server session: httpOnly cookies `bb_auth_pin_verified`, `bb_auth_read_only`
- Post-PIN: `ensureSupabaseSession()` → anonymous auth สำหรับ RLS `authenticated`
- Session fingerprint: cookie `bb_session_fp` + `revoked_sessions` table สำหรับ remote sign-out
- Login events: `login_history` (service-role write) แสดงใน Settings
- Trusted-device passkeys: `device_passkeys` table + `passkey-actions.ts`; registration requires an existing PIN-verified session.

---

## 5. Operational Constraints

| Constraint | Value |
| --- | --- |
| Timezone | GMT+7 (Bangkok) — Strict Enforcement |
| Language | Thai (primary), English (secondary) |
| Deployment Target | Vercel App Router on Vercel; runtime selected per route/API |
| Accessibility | WCAG 2.2 AA |
| Target INP | < 200ms |
| Font Weight | `font-normal` only (no bold) |
| Border Radius | `rounded-3xl` (24px) everywhere |
| Primary Background | `bg-background` token (light maps to Morning Latte Cream) |
| Primary Text | `text-foreground`; black text only on pastel surfaces via `bb-pastel-surface` |

---

## 6. Key Dependencies

```json
{
  "@ai-sdk/google": "^3.0.79",
  "@ai-sdk/react": "^3.0.192",
  "@dnd-kit/core": "^6.3.1",
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

Colocation: feature UI in `src/app/[locale]/<feature>/_components/`; shared UI in `src/components/`. See `AGENTS.md`.

| Module | Path |
| --- | --- |
| Command Center | `src/app/[locale]/page.tsx`, `_components/LiveStatusTracker.tsx` |
| Dashboard | `src/app/[locale]/dashboard/`, `_components/LiveShiftList.tsx`, `MonthlyRoster.tsx` |
| Schedule | `src/app/[locale]/schedule/ScheduleClient.tsx`, `_components/` |
| Inventory | `src/app/[locale]/inventory/InventoryClient.tsx`, `_components/`, `count/`, `accuracy/`, `branch-withdraw/` |
| Maintenance | `src/app/[locale]/maintenance/MaintenanceClient.tsx`, `_components/` |
| Sales | `src/app/[locale]/sales/SalesClient.tsx`, `_components/` |
| Settings | `src/app/[locale]/settings/page.tsx`, `_components/` |
| Auth | `src/components/auth/PinGateway.tsx`, `src/app/actions/auth.ts` |
| AI Chat | `src/components/ai/`, `src/app/api/chat/route.ts` |
| i18n Middleware | `src/proxy.ts` |
| Server Actions | `src/app/actions/` |
| Agent tools | `src/app/actions/tools/` |
| Knowledge graph | codebase-memory-mcp (`.cursor/mcp.json.example` → `.cursor/mcp.json`) |

---

## 8. Current Feature Highlights

| Feature | Key paths |
| --- | --- |
| Count accuracy | `inventory_count_verifications` (`system_stock_qty`), `recordCountVerification()`, `src/lib/inventory-count-accuracy.ts`, `src/lib/inventory-accuracy-gauge.ts` |
| Branch withdraw | `branch-withdraw-actions.ts`, `inventory-branch-withdraw-format.ts`, `record_branch_withdrawal_batch` RPC |
| Count policy | `inventory_items.count_policy`; `exact_count` scores accuracy, `sufficiency_check` skips scoring and uses manual `order_qty` |
| Quick action bulk | `recordBulkInventoryTransactions()`, `inventory-quick-*` libs, `InventoryQuickActionFAB` |
| Realtime context | `src/contexts/InventoryRealtimeContext.tsx` |
| Tooltips | `AppTooltipProvider`, `HintTooltip` |
| Server admin singleton | `src/lib/supabase-server.ts` (`getSupabaseAdmin()`) |
| Data change history UI | `settings/_components/DataChangeHistorySection.tsx` |
| Trusted-device passkeys | `device_passkeys`, `settings/_components/PasskeyDeviceSection.tsx`, `passkey-actions.ts` |
| Daily report Web Push | `push_subscriptions.branch_id` / `profile_id`, `src/lib/daily-report-web-push.ts` |
| Notification unread badge | `notification-unread-counter.ts`, `notification-badge.ts`, `notification-sync.ts`, `notification-idb.ts` |
| Dashboard optimized loading | `getDashboardShiftQueryPlan()`, `splitDashboardShiftsByRange()` |
| Inventory route performance | Row containment, stable grid handlers, dynamic modal loading, hover/focus modal preload |
| PWA icons | `/images/notification-icon*.png`, manifest theme `#000000` / background `#ffffff` |
| SQL blueprint | `sql/record_inventory_transaction.sql` |
