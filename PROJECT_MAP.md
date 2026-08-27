# PROJECT_MAP — BLACK-AND-BREW ERP

> Generated: 2026-08-27 (GMT+7) | Version: 9.4

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
| Branch Withdraw | `src/app/[locale]/inventory/branch-withdraw/` | Active |
| Maintenance | `src/app/[locale]/maintenance/` | Active |
| Bean Orders | `src/app/[locale]/bean-orders/` | Active |
| Settings | `src/app/[locale]/settings/` | Active |

---

## Routes

### Pages

| Route | Shell | Client / feature UI |
| --- | :--- | --- |
| `/` | `src/app/page.tsx` | redirect → `/th` |
| `/[locale]` | `src/app/[locale]/page.tsx` | `HomePageClient.tsx`, `_components/LiveStatusTracker.tsx`, `HomeOpsPanels.tsx`, … |
| `/[locale]/dashboard` | `dashboard/page.tsx` | `_components/LiveShiftList.tsx`, `MonthlyRoster.tsx` |
| `/[locale]/schedule` | `schedule/page.tsx` | `ScheduleClient.tsx`, `_components/ScheduleToolbar.tsx`, `ShiftSettingsModal.tsx` |
| `/[locale]/inventory` | `inventory/page.tsx` | `InventoryClient.tsx`, `_components/*` |
| `/[locale]/inventory/count` | `count/page.tsx` | `InventoryCountClient.tsx` |
| `/[locale]/inventory/accuracy` | `accuracy/page.tsx` | `_components/AccuracyGauge.tsx` |
| `/[locale]/inventory/branch-withdraw` | `branch-withdraw/page.tsx` | `BranchWithdrawClient.tsx` |
| `/[locale]/maintenance` | `maintenance/page.tsx` | `MaintenanceClient.tsx`, `_components/MaintenanceModals.tsx` |
| `/[locale]/bean-orders` | `bean-orders/page.tsx` | `BeanOrdersClient.tsx`, `_components/BeanOrderListItem.tsx` |
| `/[locale]/bean-orders/new` | `bean-orders/new/page.tsx` | `BeanOrderFormClient.tsx` |
| `/[locale]/bean-orders/[id]` | `bean-orders/[id]/page.tsx` | `BeanOrderDetailClient.tsx` |
| `/[locale]/bean-orders/[id]/edit` | `bean-orders/[id]/edit/page.tsx` | `BeanOrderFormClient.tsx` |
| `/[locale]/settings` | `settings/page.tsx` | `_components/*` (theme, sessions, passkeys, notifications) |

Locales: `th`, `en`

### API

| Route | File |
| --- | :--- |
| `/api/chat` | `src/app/api/chat/route.ts` |
| `/api/daily-report` | `src/app/api/daily-report/route.ts` |
| `/api/push/webhook` | `src/app/api/push/webhook/route.ts` |
| `/api/inventory/offline-mutation` | `src/app/api/inventory/offline-mutation/route.ts` |
| `/api/insight-alerts` | `src/app/api/insight-alerts/route.ts` |

Cron schedules: **cron-job.org** (Asia/Bangkok) — not Vercel Cron. See `.env.example` § CRON.

---

## Project Structure

```text
black-and-brew/
├── config/                  # Vercel firewall rules (`vercel-firewall.json`)
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
│   ├── components/          # Shared UI (2+ features): auth, sidebar, shell (DeferredOverlays, ViewTransitionNavigation, RoutePrefetchOnIdle), ui (incl. rounded-select), notifications
│   ├── contexts/            # InventoryRealtimeContext
│   ├── hooks/
│   ├── lib/                 # Domain logic (schedule/, inventory-*, route-chunk-preload, warm-route-navigation, view-transition, passkey/, policies/, proactive-insights/, offline-*, …)
│   ├── test/                # Vitest suites
│   ├── workers/             # Web Workers (inventory-table.worker.ts)
│   └── proxy.ts             # next-intl middleware (Next.js 16)
├── AGENTS.md, README.md, PROJECT_MAP.md
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
| `branch-withdraw-actions.ts` | Branch 2 withdrawal batch save + history |
| `bean-order-actions.ts` | Bean order CRUD, payment slips, shipping, manual delivery confirm |
| `shift-actions.ts` | Shift CRUD, roster |
| `holiday-actions.ts` | Google Calendar + regular holidays |
| `maintenance-actions.ts` | Service record CRUD |
| `daily-report-actions.ts` | Daily schedule report compiler |
| `push-actions.ts` | Web Push subscription lifecycle |
| `app-preferences-actions.ts` | Branch-scoped UI prefs (sidebar menu order sync) |
| `data-change-log-actions.ts` | Mutation audit + inventory Web Push hook |
| `migrate-inventory-sort-order.ts` | One-shot inventory sort-order DB migration helper |
| `schedule-sheets-sync-actions.ts` | Schedule → Google Sheets sync |
| `tools/database-tools.ts` | AI `readTable` (via `ai-data-gateway.ts`) |
| `tools/search-tools.ts` | AI Tavily search |

---

## Tests (`src/test/`)

Key suites: `dashboard-data-loading.test.ts`, `inventory-grid-performance.test.ts`, `inventory-grid-a11y.test.ts`, `inventory-grid-cell-blur.test.ts`, `schedule-grid-a11y.test.ts`, `maintenance-form-a11y.test.ts`, `ui-motion-focus-audit.test.ts`, `bundle-route-loading.test.ts`, `daily-report-web-push.test.ts`, `inventory_count_policy.test.ts`, `inventory-branch-withdraw-format.test.ts`, `branch-withdraw-dialog.test.ts`, `inventory_quick_action_fab.test.ts`, `notification-fab-sync.test.ts`, `offline-mutation-route.test.ts`, `web-push.test.ts`, `inventory_stock_sync.test.ts`, `schedule-grid-crosshair.test.ts`, `schedule-clear-all-removed.test.ts`, `live_shift_list.test.ts`, `bean-orders-*.test.ts`, `rounded-select.test.ts`, `ai-data-gateway.test.ts`, `ai-deterministic-routes.test.ts`, `ai-intent-classifier.test.ts`, `sidebar-menu-order.test.ts`, `pwa-sidebar-navigation.test.ts`, `proactive-insights-*.test.ts`, `insight-alerts-route.test.ts`, `insight-web-push.test.ts`, `home-ops-panels.test.tsx`, `view-transition-navigation-race.test.ts`, `warm-route-navigation.test.ts`, `inventory-transaction-result.test.ts`, `inventory-in-out-theoretical.test.ts`

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
