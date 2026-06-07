# PROJECT_MAP — BLACK-AND-BREW ERP

> **Generated:** 2026-06-07 (GMT+7) | **Root:** `C:\Users\chach\.gemini\antigravity\scratch\black-and-brew` | **Version:** 6.9

---

## Active Modules

| Module | Path | Status |
| :--- | :--- | :--- |
| Command Center | `src/app/[locale]/page.tsx` | Active |
| Dashboard | `src/app/[locale]/dashboard/` | Active |
| Schedule | `src/app/[locale]/schedule/` | Active |
| Inventory | `src/app/[locale]/inventory/` | Active |
| Stock Count | `src/app/[locale]/inventory/count/` | Active |
| Maintenance | `src/app/[locale]/maintenance/` | Active |
| Sales | `src/app/[locale]/sales/` | Active |
| Market Insights | `src/app/[locale]/market-insights/` | Active |

---

## Routes

### Pages

| Route | File |
| :--- | :--- |
| `/` | `src/app/page.tsx` → redirect `/th` |
| `/[locale]` | `src/app/[locale]/page.tsx` |
| `/[locale]/dashboard` | `src/app/[locale]/dashboard/page.tsx` |
| `/[locale]/schedule` | `src/app/[locale]/schedule/page.tsx` |
| `/[locale]/inventory` | `src/app/[locale]/inventory/page.tsx` |
| `/[locale]/inventory/count` | `src/app/[locale]/inventory/count/page.tsx` |
| `/[locale]/maintenance` | `src/app/[locale]/maintenance/page.tsx` |
| `/[locale]/sales` | `src/app/[locale]/sales/page.tsx` |
| `/[locale]/market-insights` | `src/app/[locale]/market-insights/page.tsx` |

**Locales:** `th`, `en`

### API

| Route | File |
| :--- | :--- |
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
├── sql/                     # sync_inventory_stock.sql, fix_inventory_rls.sql, ai_agent_views.sql
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
│   │   ├── dashboard/       # LiveStatusTracker, WeatherWidget
│   │   ├── providers/       # AuthProvider, I18nProvider
│   │   ├── sidebar/         # Sidebar, Menu, SheetMenu, …
│   │   └── ui/              # button, ClickableDatePicker, page-transition, floating-alert, …
│   ├── hooks/
│   ├── i18n/                # request.ts, routing.ts
│   ├── lib/                 # supabase, motion-presets, inventory-stock, auth-constants, …
│   ├── test/                # 17 Vitest test files
│   └── proxy.ts             # next-intl middleware (Next.js 16 convention)
├── *.sql                    # Root-level schema/migration scripts
├── AGENTS.md, CLAUDE.md, MASTER_BLUEPRINT.md, README.md
├── PROTOCOL_ENFORCER.md, SKILLS_INVENTORY.md, VERIFICATION_REPORT.md
└── package.json, next.config.ts, vitest.config.ts, vercel.json
```

---

## Server Actions (`src/app/actions/`)

| File | Purpose |
| :--- | :--- |
| `auth.ts` | PIN verify, read-only session, cookies |
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

## Tests (`src/test/`)

`auth.test.ts`, `session_auth.test.tsx`, `read-only-guard.test.ts`, `inventory_stock_sync.test.ts`, `daily_report_actions.test.ts`, `mobile_layout.test.tsx`, `schedule_regular_holidays.test.tsx`, `dashboard_date_cookies.test.ts`, `date_compliance.test.ts`, `ai_chat_typography.test.ts`, `ai_inventory_analysis.test.ts`, `market-insights-context.test.ts`, `run_migration.test.ts`, `zero_persistence.test.ts`, `basic.test.ts`, `setup.ts`

---

## Tech Stack

| Package | Version |
| :--- | :--- |
| next | 16.2.4 |
| react / react-dom | 19.2.4 |
| @supabase/supabase-js | ^2.105.1 |
| next-intl | ^4.11.0 |
| tailwindcss | ^4 |
| vitest | ^4.1.6 |
| ai / @ai-sdk/google | ^6.0 / ^3.0 |

---

> _RepoMap is a zero-dependency context tool. Run before every Audit task to reduce token usage._
