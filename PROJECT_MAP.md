# PROJECT_MAP — BLACK-AND-BREW ERP

> Generated: 2026-07-10 (GMT+7) | Version: 9.1

Agent navigation: prefer **codebase-memory-mcp** (`search_graph`, `trace_path`) over reading this file wholesale. Canonical agent rules: `AGENTS.md`.

---

## Active Modules

| Module | Path | Status |
| --- | :--- | --- |
| Command Center | `src/app/[locale]/page.tsx` | Active |
| Dashboard | `src/app/[locale]/dashboard/` | Active |
| Schedule | `src/app/[locale]/schedule/` | Active |
| Inventory | `src/app/[locale]/inventory/` | Active |
| Stock Count | `src/app/[locale]/inventory/count/` | Active |
| Inventory Accuracy | `src/app/[locale]/inventory/accuracy/` | Active |
| Maintenance | `src/app/[locale]/maintenance/` | Active |
| Sales | `src/app/[locale]/sales/` | Active |
| Settings | `src/app/[locale]/settings/` | Active |

---

## Routes

### Pages

| Route | Shell | Client / feature UI |
| --- | :--- | --- |
| `/` | `src/app/page.tsx` | redirect → `/th` |
| `/[locale]` | `src/app/[locale]/page.tsx` | `_components/LiveStatusTracker.tsx` |
| `/[locale]/dashboard` | `dashboard/page.tsx` | `_components/LiveShiftList.tsx`, `MonthlyRoster.tsx` |
| `/[locale]/schedule` | `schedule/page.tsx` | `ScheduleClient.tsx`, `_components/ScheduleToolbar.tsx`, `ShiftSettingsModal.tsx` |
| `/[locale]/inventory` | `inventory/page.tsx` | `InventoryClient.tsx`, `_components/*` |
| `/[locale]/inventory/count` | `count/page.tsx` | `InventoryCountClient.tsx` |
| `/[locale]/inventory/accuracy` | `accuracy/page.tsx` | report page |
| `/[locale]/maintenance` | `maintenance/page.tsx` | `MaintenanceClient.tsx`, `_components/MaintenanceModals.tsx` |
| `/[locale]/sales` | `sales/page.tsx` | `SalesClient.tsx`, `_components/SalesTopProductsChart.tsx` |
| `/[locale]/settings` | `settings/page.tsx` | `_components/*` (theme, sessions, passkeys, notifications) |

Locales: `th`, `en`

### API

| Route | File |
| --- | :--- |
| `/api/chat` | `src/app/api/chat/route.ts` |
| `/api/daily-report` | `src/app/api/daily-report/route.ts` |
| `/api/push/webhook` | `src/app/api/push/webhook/route.ts` |

---

## Project Structure

```text
black-and-brew/
├── docs/                    # Project documentation (see README § Documentation)
├── messages/                # th.json, en.json (next-intl)
├── public/                  # sw.js (PWA), images
├── supabase/migrations/     # Versioned DB migrations (see docs/database.md)
├── sql/                     # RPC/views blueprints + historical/ schemas
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── _components/           # locale-wide (e.g. LiveStatusTracker)
│   │   │   ├── <feature>/
│   │   │   │   ├── page.tsx             # RSC shell
│   │   │   │   ├── *Client.tsx          # client boundary
│   │   │   │   └── _components/         # feature-only UI (private folder)
│   │   │   ├── layout.tsx, globals.css
│   │   ├── actions/                   # Server Actions + tools/
│   │   ├── api/
│   │   ├── manifest.ts
│   │   └── page.tsx
│   ├── components/          # Shared UI (2+ features): auth, sidebar, ui, ai, notifications
│   ├── contexts/            # InventoryRealtimeContext
│   ├── hooks/
│   ├── lib/                 # Domain logic (schedule/, inventory-*, passkey/, …)
│   ├── test/                # Vitest suites
│   └── proxy.ts             # next-intl middleware (Next.js 16)
├── AGENTS.md, CLAUDE.md, README.md, PROJECT_MAP.md
└── package.json, next.config.ts, vitest.config.ts, vercel.json
```

---

## Server Actions (`src/app/actions/`)

| File | Purpose |
| --- | :--- |
| `auth.ts` | PIN verify, session revocation, read-only guard |
| `passkey-actions.ts` | WebAuthn trusted-device passkeys |
| `login-history-actions.ts` | Login audit + active sessions |
| `inventory-actions.ts` | Stock RPC, count policy, transactions, CRUD |
| `shift-actions.ts` | Shift CRUD, roster |
| `holiday-actions.ts` | Google Calendar + regular holidays |
| `maintenance-actions.ts` | Service record CRUD |
| `sales-actions.ts` | Excel upload, categories |
| `daily-report-actions.ts` | Daily schedule report compiler |
| `push-actions.ts` | Web Push subscription lifecycle |
| `data-change-log-actions.ts` | Mutation audit + inventory Web Push hook |
| `tools/database-tools.ts` | AI `readTable` (via `ai-data-gateway.ts`) |
| `tools/search-tools.ts` | AI Tavily search |

---

## Tests (`src/test/`)

Key suites: `dashboard-data-loading.test.ts`, `inventory-grid-performance.test.ts`, `bundle-route-loading.test.ts`, `daily-report-web-push.test.ts`, `inventory_count_policy.test.ts`, `web-push.test.ts`, `inventory_stock_sync.test.ts`, `schedule-grid-crosshair.test.ts`, `live_shift_list.test.ts`

---

## Tech Stack

| Package | Version |
| --- | :--- |
| next | 16.2.4 |
| react / react-dom | 19.2.4 |
| @supabase/supabase-js | ^2.105.1 |
| next-intl | ^4.11.0 |
| next-themes | ^0.4 |
| tailwindcss | ^4 |
| vitest | ^4.1.6 |

---

> Run `npm test` and `npm run build` before shipping. Re-index codebase-memory-mcp after structural changes.
