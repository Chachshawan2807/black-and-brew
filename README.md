# BLACK-AND-BREW ERP System

Enterprise Resource Planning สำหรับร้านกาแฟ BLACK AND BREW — จัดการตารางงาน คลังสินค้า ยอดขาย บำรุงรักษา วิเคราะห์ตลาด และ AI Assistant (บรู) บนแพลตฟอร์มเดียว

> Version: 9.0 | Stack: Next.js 16.2.4 · React 19.2.4 · Supabase · Tailwind CSS 4 · next-themes

---

## Features

| Module | Route | Description |
| --- | :--- | --- |
| Command Center | `/[locale]` | สถานะกะงานวันนี้/พรุ่งนี้แบบเรียลไทม์ |
| Staff Dashboard | `/[locale]/dashboard` | ลงเวลา รายชื่อกะ ตารางรายเดือน |
| Schedule | `/[locale]/schedule` | จัดกะ Drag-and-Drop + วันหยุดราชการ |
| Inventory | `/[locale]/inventory` | ตารางคลังสินค้าแบบ Spreadsheet + FAB Quick Action + Undo/Redo + นโยบายการนับสินค้า |
| Stock Count | `/[locale]/inventory/count` | ตรวจนับสต็อกจริง; แยก `exact_count` กับ `sufficiency_check` |
| Inventory Accuracy | `/[locale]/inventory/accuracy` | รายงานความแม่นยำเฉพาะสินค้าที่ตั้งค่าเป็นนับจริง |
| Maintenance | `/[locale]/maintenance` | บันทึกการซ่อมบำรุงอุปกรณ์ |
| Sales | `/[locale]/sales` | อัปโหลด Excel วิเคราะห์ยอดขาย |
| Market Insights | `/[locale]/market-insights` | วิเคราะห์ตลาดด้วย Gemini AI โดยรวม weather, holidays, local events, sales และ stock signals |
| Settings | `/[locale]/settings` | ธีม, ประวัติการเข้าใช้, trusted-device passkeys, การแจ้งเตือน |
| AI Chat (บรู) | Global overlay | แชท AI พร้อมเครื่องมือดึงข้อมูลร้าน |

Locales: `th` (หลัก), `en` — Root `/` redirect ไป `/th`

---

## Quick Start

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. คัดลอกและกรอก environment variables
cp .env.example .env.local

# 3. รัน dev server
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) — ระบบจะ redirect ไป `/th` และแสดง PIN Gateway

### Scripts

| Command | Purpose |
| --- | :--- |
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run lint:md` | Markdownlint (scoped: `docs/**/*.md`, root `*.md`) |
| `npm run lint:md:fix` | Markdownlint auto-fix |
| `npm test` | Vitest test suite |
| `npm run db:verify` | Verify Supabase migration state |

---

## Environment Variables

คัดลอกจาก [.env.example](.env.example) → `.env.local` (local) หรือตั้งใน Vercel Dashboard → Production (deploy)

Legend: `[PUBLIC]` = ฝังใน browser · `[SECRET]` = server-only · `[OPTION]` = ไม่บังคับ

### Supabase

| Variable | Scope | Purpose |
| --- | :--- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | PUBLIC | Supabase project URL — client + auth gate |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | PUBLIC | Anon key สำหรับ RLS client |
| `SUPABASE_SERVICE_ROLE_KEY` | SECRET | Admin key — Server Actions, AI tools, cron (ห้ามใส่ `NEXT_PUBLIC_`) |

### Auth & Location

| Variable | Scope | Purpose |
| --- | :--- | --- |
| `APP_PIN` | SECRET | PIN 6 หลัก — เข้าใช้งานเต็มสิทธิ์ (`auth.ts`) |
| `APP_READ_ONLY_PIN` | SECRET | PIN 6 หลัก — โหมดดูอย่างเดียว (`resolveReadOnlyPin()`); บังคับใน production; dev fallback `111222` |
| `NEXT_PUBLIC_STORE_LAT` | PUBLIC | พิกัดร้าน (default `13.9312`) — chat, insights, cron |
| `NEXT_PUBLIC_STORE_LON` | PUBLIC | พิกัดร้าน (default `100.6756`) |
| `WEBAUTHN_RP_ID` | SECRET | OPTION — WebAuthn relying-party ID สำหรับ production passkeys |
| `WEBAUTHN_ORIGIN` | SECRET | OPTION — WebAuthn origin สำหรับ production passkeys |

### AI & External APIs

| Variable | Scope | Purpose |
| --- | :--- | --- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | SECRET | Gemini — AI Chat + Market Insights (`@ai-sdk/google`) |
| `TAVILY_API_KEY` | SECRET | Internet search tool สำหรับ AI |
| `OPENWEATHER_API_KEY` | SECRET | `/api/weather`, daily-report, market-insights |
| `GOOGLE_CALENDAR_API_KEY` | SECRET | OPTION — sync วันหยุดราชการ (schedule) |
| `GOOGLE_PLACES_API_KEY` | SECRET | OPTION — Market Insights v2 nearby cafés |

### LINE & Vercel Cron

| Variable | Scope | Purpose |
| --- | :--- | --- |
| `LINE_CHANNEL_ACCESS_TOKEN` | SECRET | LINE Messaging API push token |
| `LINE_GROUP_ID` | SECRET | ปลายทาง cron (ตรวจก่อน `LINE_TARGET_*`) |
| `LINE_TARGET_RECIPIENT_ID` | SECRET | ปลายทาง LINE fallback (user/group/room ID) |
| `CRON_SECRET` | SECRET | ยืนยัน `GET /api/daily-report` — `Authorization: Bearer …` |

### Web Push (Cross-Device Inventory Alerts)

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | PUBLIC | VAPID public key — `PushManager.subscribe()` |
| `VAPID_PRIVATE_KEY` | SECRET | VAPID private key — `web-push` server sends |
| `VAPID_SUBJECT` | SECRET | Contact URI (`mailto:` or `https:`) for push service |
| `PUSH_WEBHOOK_SECRET` | SECRET | OPTION — auth for `POST /api/push/webhook` backup path |

Generate keys: `npx web-push generate-vapid-keys`

รายละเอียดและ path ในโค้ดที่อ่านแต่ละตัว → [.env.example](.env.example)

---

## Authentication

- PIN Gateway (`PinGateway.tsx`): ป้อน PIN 6 หลักก่อนเข้าแอป
- Full access: `APP_PIN` (env) — แก้ไขข้อมูลได้ทุกโมดูล
- Read-only: `APP_READ_ONLY_PIN` (env) — ดูอย่างเดียว; dev fallback `111222` via `src/lib/security/read-only-pin.ts`
- Trusted-device passkeys: `device_passkeys` table stores WebAuthn credentials for biometric login after a PIN-verified registration.
- Dual storage: `sessionStorage` (client gate) + httpOnly cookies (`bb_auth_pin_verified`, `bb_auth_read_only`, `bb_session_fp`)
- Session audit: `login_history` table — บันทึก login/logout พร้อม device fingerprint
- Remote revocation: `revoked_sessions` table — บังคับออกจากระบบต่ออุปกรณ์จาก Settings
- Web Push: `push_subscriptions` table — แจ้งเตือนคลังสินค้าข้ามอุปกรณ์ผ่าน VAPID (`PushSubscriptionManager` ใน layout)
- Write guard: Server Actions เรียก `assertWritableSession()` ก่อน mutation

---

## Architecture

```text
src/
├── app/
│   ├── page.tsx              # Redirect → /th
│   ├── manifest.ts           # PWA manifest
│   ├── actions/              # Server Actions (inventory, shift, auth, sales, …)
│   ├── api/                  # chat, daily-report, weather, push/webhook
│   └── [locale]/             # UI routes (th/en)
├── components/               # auth, sidebar, ui, ai, dashboard
├── lib/                      # supabase, motion-presets, inventory-stock, …
├── i18n/                     # next-intl routing
└── proxy.ts                  # next-intl middleware (Next.js 16 convention)
```

- Database: Supabase PostgreSQL (Thailand Edge)
- Stock sync: RPC `set_inventory_stock` — ดู `sql/sync_inventory_stock.sql`
- Count policy: `inventory_items.count_policy` — `exact_count` คิดรวม accuracy; `sufficiency_check` ใช้ `order_qty` แบบ manual และไม่คิดรวมคะแนน
- RLS hardening: `sql/fix_inventory_rls.sql` (authenticated-only หลัง anonymous sign-in)
- PWA: `src/app/manifest.ts` (icons `/images/notification-icon*.png`, theme `#000000`, background `#ffffff`) + `public/sw.js` (Network-First) + `PwaRegister.tsx`
- Performance posture: dashboard shift reads consolidate overlapping week/month ranges; inventory grid uses row containment and dynamic modal chunks with hover/focus preload; chart and AI overlays remain route/intent split where safe.
- Web Push: `push_subscriptions` supports cross-device inventory alerts and daily schedule report broadcasts with `branch_id` / `profile_id` filtering.

---

## Documentation

| Doc | Purpose |
| --- | :--- |
| [docs/changelog.md](docs/changelog.md) | ประวัติการเปลี่ยนแปลง |
| [docs/architecture.md](docs/architecture.md) | สถาปัตยกรรมและ data flow |
| [docs/database.md](docs/database.md) | Schema, RLS, RPC |
| [docs/api.md](docs/api.md) | Server Actions reference |
| [docs/design.md](docs/design.md) | UI/UX standards (Zero-Bold, Pastel, Dual Theme) |
| [docs/SOP.md](docs/SOP.md) | Development SOP (TDD) |
| [docs/MASTER_BLUEPRINT.md](docs/MASTER_BLUEPRINT.md) | Blueprint ฉบับสมบูรณ์ (canonical) |
| [AGENTS.md](AGENTS.md) | กฎสำหรับ AI agents |

---

## Contributing

1. อ่าน [docs/SOP.md](docs/SOP.md) และ [docs/design.md](docs/design.md)
2. ปฏิบัติตาม Zero-Bold Policy (`font-normal` เท่านั้น)
3. รัน `npm test` และ `npm run build` ก่อน PR

---

## License

Proprietary and confidential. All rights reserved.
