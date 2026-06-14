# PROJECT_MAP — BLACK-AND-BREW ERP

> **Generated:** 2026-06-15 (GMT+7) | **Root:** `C:\Users\chach\.gemini\antigravity\scratch\black-and-brew` | **Version:** 8.6

---

## Active Modules

| Module | Path | Status |
| --- | :--- | --- |
| Command Center | `src/app/[locale]/page.tsx` | Active |
| Dashboard | `src/app/[locale]/dashboard/` | Active |
| Schedule | `src/app/[locale]/schedule/` | Active |
| Inventory | `src/app/[locale]/inventory/` | Active |
| Stock Count | `src/app/[locale]/inventory/count/` | Active |
| Maintenance | `src/app/[locale]/maintenance/` | Active |
| Sales | `src/app/[locale]/sales/` | Active |
| Market Insights | `src/app/[locale]/market-insights/` | Active |
| Settings | `src/app/[locale]/settings/` | Active |

---

## Routes

### Pages

| Route | File |
| --- | :--- |
| `/` | `src/app/page.tsx` → redirect `/th` |
| `/[locale]` | `src/app/[locale]/page.tsx` |
| `/[locale]/dashboard` | `src/app/[locale]/dashboard/page.tsx` |
| `/[locale]/schedule` | `src/app/[locale]/schedule/page.tsx` |
| `/[locale]/inventory` | `src/app/[locale]/inventory/page.tsx` |
| `/[locale]/inventory/count` | `src/app/[locale]/inventory/count/page.tsx` |
| `/[locale]/maintenance` | `src/app/[locale]/maintenance/page.tsx` |
| `/[locale]/sales` | `src/app/[locale]/sales/page.tsx` |
| `/[locale]/market-insights` | `src/app/[locale]/market-insights/page.tsx` |
| `/[locale]/settings` | `src/app/[locale]/settings/page.tsx` |

**Locales:** `th`, `en`

### API

| Route | File |
| --- | :--- |
| `/api/chat` | `src/app/api/chat/route.ts` |
| `/api/daily-report` | `src/app/api/daily-report/route.ts` |
| `/api/weather` | `src/app/api/weather/route.ts` |

---

## Project Structure

```text
black-and-brew/
├── docs/                    # Project documentation
├── messages/                # th.json, en.json (next-intl)
├── public/                  # sw.js (PWA), images, ai-agent-logo.svg
├── supabase/migrations/     # Versioned DB migrations (6 files — see docs/database.md)
├── sql/                     # record_inventory_transaction.sql, sync_inventory_stock.sql, fix_inventory_rls.sql, ai_agent_views.sql
├── src/
│   ├── app/
│   │   ├── [locale]/        # UI pages + layout + globals.css
│   │   ├── actions/         # Server Actions + tools/
│   │   ├── api/             # chat, daily-report, weather
│   │   ├── manifest.ts
│   │   └── page.tsx
│   ├── components/
│   │   ├── ai/              # AIChatOverlay, AIChatWrapper
│   │   ├── auth/            # PinGateway
│   │   ├── inventory/       # InventoryQuickActionFAB, InventoryQuickActionBar, InventoryHistoryModal
│   │   ├── notifications/   # NotificationBell, NotificationPanel, InventoryNotificationFAB
│   │   ├── settings/        # NotificationPreferencesSection, DataChangeHistorySection
│   │   ├── dashboard/       # LiveStatusTracker, WeatherWidget
│   │   ├── providers/       # AuthProvider, I18nProvider, ThemeProvider, AppTooltipProvider
│   │   ├── sidebar/         # Sidebar, Menu, SheetMenu, …
│   │   └── ui/              # button, hint-tooltip, tooltip, ClickableDatePicker, page-transition, …
│   ├── contexts/            # InventoryRealtimeContext
│   ├── hooks/               # use-inventory-notifications, use-inventory-quick-action
│   ├── i18n/                # request.ts, routing.ts
│   ├── lib/                 # supabase, supabase-server, inventory-in-out-theoretical, inventory-quick-*, …
│   ├── test/                # 58 Vitest test files
│   └── proxy.ts             # next-intl middleware (Next.js 16 convention)
├── *.sql                    # Root-level schema/migration scripts
├── AGENTS.md, CLAUDE.md, MASTER_BLUEPRINT.md, README.md
├── PROTOCOL_ENFORCER.md, SKILLS_INVENTORY.md, VERIFICATION_REPORT.md
└── package.json, next.config.ts, vitest.config.ts, vercel.json
```

---

## Server Actions (`src/app/actions/`)

| File | Purpose |
| --- | :--- |
| `auth.ts` | PIN verify, session revocation, read-only session, cookies |
| `login-history-actions.ts` | Login audit trail + active sessions |
| `inventory-actions.ts` | Stock RPC, transactions, CRUD |
| `shift-actions.ts` | Shift CRUD, roster, revalidation |
| `holiday-actions.ts` | Google Calendar + regular holidays |
| `maintenance-actions.ts` | Service record CRUD |
| `sales-actions.ts` | Excel upload, categories, metrics |
| `market-insights-actions.ts` | Gemini market analysis |
| `daily-report-actions.ts` | LINE daily report compiler |
| `line-actions.ts` | LINE Messaging API push |
| `migrate-inventory-sort-order.ts` | DB-only sort_order re-sequence |
| `tools/database-tools.ts` | AI readTable tool |
| `tools/search-tools.ts` | AI Tavily search |
| `tools/internal-sources-tools.ts` | AI internal context |

---

## Tests (`src/test/` — 58 files)

Key suites: `inventory-count-accuracy.test.ts`, `inventory-in-out-theoretical.test.ts`, `inventory-quick-bulk.test.ts`, `inventory-quick-action-draft.test.ts`, `inventory-quick-qty-step.test.ts`, `inventory-quick-search-filter.test.ts`, `inventory_stock_sync.test.ts`, `inventory_quick_action_fab.test.ts`, `supabase-session.test.ts`, `pwa-notification-bridge.test.ts`, `market-insights-v2.test.ts`, `auth.test.ts`, `read-only-guard.test.ts`, `basic.test.ts`, `setup.ts`

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
| ai / @ai-sdk/google | ^6.0 / ^3.0 |

---

> _RepoMap is a zero-dependency context tool. Run before every Audit task to reduce token usage._
