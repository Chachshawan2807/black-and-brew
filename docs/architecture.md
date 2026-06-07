# Architecture — BLACKANDBREW ERP

> **Version:** 8.1 | **Last Updated:** 2026-06-08 | **Stack:** Next.js 16.2.4 + React 19.2.4 + Supabase

---

## 1. Overview

Hybrid PPR architecture: Static Shell (Navigation, Branding) + Dynamic Islands (Real-time data via Supabase `connection()`).

### Tech Stack

- **Framework:** Next.js 16.2.4 (App Router, `cacheComponents: true`) + React 19.2.4
- **Database:** Supabase PostgreSQL (Thailand Edge Region)
- **Styling:** Tailwind CSS 4 + PostCSS
- **State:** Zustand (global), React useState (local)
- **i18n:** next-intl v4.11.0 (th/en) via `src/proxy.ts`
- **DnD:** @dnd-kit/core + sortable
- **AI:** Vercel AI SDK v6 + `@ai-sdk/google` (Gemini)
- **Testing:** Vitest + Testing Library
- **Deploy:** Vercel Edge Runtime
- **Motion:** framer-motion + `src/lib/motion-presets.ts` (v6.9)

---

## 2. Authentication Flow

```text
User opens app → PinGateway (sessionStorage check)
→ verifyPin() Server Action → httpOnly cookies set
→ ensureSupabaseSession() → anonymous auth for RLS
→ Full access (APP_PIN) or Read-only (111222)
→ Write actions call assertWritableSession()
```

| Layer | Storage | Keys |
| :--- | :--- | :--- |
| Client gate | `sessionStorage` | `bb_auth_pin_verified` |
| Server session | httpOnly cookies | `bb_auth_pin_verified`, `bb_auth_read_only` |
| Supabase RLS | Anonymous session | `authenticated` role |

---

## 3. Supabase Dual-Client Strategy

| Context | Key | Purpose |
| :--- | :--- | :--- |
| Client Components (`src/lib/supabase.ts`) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Real-time subs, client reads |
| Server Actions | `SUPABASE_SERVICE_ROLE_KEY` | Admin ops, AI tools, daily report |

**RLS:** `sql/fix_inventory_rls.sql` — authenticated-only policies; client must sign in anonymously after PIN.

```typescript
export const supabase = createClient(url, anonKey, {
  realtime: { params: { eventsPerSecond: 2 } },
  db: { schema: 'public' },
});
```

---

## 4. Route Structure

```text
src/app/
├── page.tsx                     # Root redirect → /th
├── manifest.ts                  # PWA manifest
├── actions/
│   ├── auth.ts                  # PIN verify, read-only guard
│   ├── inventory-actions.ts     # Stock RPC, transactions
│   ├── shift-actions.ts         # Shift CRUD
│   ├── holiday-actions.ts       # Google Calendar + regular holidays
│   ├── maintenance-actions.ts   # Service records
│   ├── sales-actions.ts         # Excel upload, categories
│   ├── market-insights-actions.ts
│   ├── daily-report-actions.ts  # LINE report compiler
│   ├── line-actions.ts
│   └── tools/                   # AI agent tools
├── api/
│   ├── chat/route.ts            # Streaming AI (ToolLoopAgent)
│   ├── daily-report/route.ts    # Vercel Cron endpoint
│   └── weather/route.ts         # OpenWeatherMap proxy
└── [locale]/
    ├── layout.tsx               # PinGateway, sidebar, AI chat, PWA
    ├── page.tsx                 # Command Center
    ├── dashboard/               # Staff dashboard
    ├── schedule/                # Shift management (DnD)
    ├── inventory/               # Warehouse spreadsheet
    │   └── count/               # Stock-taking
    ├── maintenance/             # Equipment tracking
    ├── sales/                   # Sales analytics
    └── market-insights/         # AI market analysis
```

**i18n middleware:** `src/proxy.ts` (Next.js 16 convention — not `src/middleware.ts`)

---

## 5. Data Flow Patterns

### Inventory Edit (Spreadsheet)

```text
onChange → local state → onBlur → updateInventoryStock() [RPC set_inventory_stock]
→ optimistic update → Supabase realtime merge → all windows sync
```

### Stock-Taking Count

```text
CountInput blur → optimistic setItems → updateInventoryStock()
→ realtime merge → warehouse PO modal recalculates via computeItemsToOrder()
```

### Transaction Recording (Atomic via RPC)

```text
Quick Entry → recordTransaction() → supabase.rpc('record_inventory_transaction')
→ Row Lock (FOR UPDATE) → Validate → UPDATE stock → INSERT transaction → RETURN
```

### AI Chat

```text
AIChatOverlay → POST /api/chat → ToolLoopAgent (Gemini 2.5 Flash)
→ tools: getDailyShifts, readTable, internetSearchTool
→ daily schedule queries short-circuit to deterministic stream (no LLM)
→ streaming response → XSS sanitization on display
```

> **AI tools (`src/app/api/chat/route.ts`):** `getDailyShifts` (daily roster), `readTable` (other internal tables), `internetSearchTool` (external/weather). Weather is served via `internetSearchTool` — there is no separate `weather` AI tool.

### Daily LINE Report

```text
Vercel Cron → /api/daily-report → compileDailyReportPayload()
→ shifts + inventory alerts + weather + holidays → sendLineNotification()
```

---

## 6. State Management

| Type | Tool | Scope |
| :--- | :--- | :--- |
| Global UI | Zustand | Sidebar toggle |
| Auth | AuthProvider + cookies | PIN session, read-only |
| Page-level | useState | Items, columns, modals |
| History | undoStack/redoStack | Inventory undo/redo |
| Persistence | localStorage + `inventory_config` | Column widths/labels |
| Real-time | Supabase Channels | Cross-device sync |

---

## 7. External Integrations

| Service | Auth | Purpose |
| :--- | :--- | :--- |
| Supabase | Anon + Service Role | DB, Auth, Real-time |
| Google Calendar API | `GOOGLE_CALENDAR_API_KEY` | Thai holiday sync |
| Google Gemini | `GOOGLE_GENERATIVE_AI_API_KEY` | AI Chat + Market Insights |
| OpenWeatherMap | `OPENWEATHER_API_KEY` | Weather widget + daily report |
| Tavily | `TAVILY_API_KEY` | AI web search |
| LINE Messaging API | `LINE_CHANNEL_ACCESS_TOKEN` | Daily push notifications |
| Vercel | Git deployment | Edge hosting + Cron |

---

## 8. Motion Architecture (v6.9)

| Layer | Implementation | Scope |
| :--- | :--- | :--- |
| Route transitions | `PageTransition` + `motion-presets.pageContent` | All pages via `SidebarLayout` |
| Modals / Sheets | CSS `.bb-modal-*` + framer `modalContent` | Schedule, Maintenance, Inventory PO |
| Toasts / Alerts | `FloatingAlert`, `FloatingToast` | Schedule holiday warning, Maintenance save |
| Micro-interactions | `.bb-transition`, Button `duration-200` | Buttons, inputs, sidebar links |
| CSS utilities | `globals.css` `@layer utilities` | `animate-in`, `fade-in`, `zoom-in-95`, `slide-*` |

**Constraint:** Motion changes opacity/transform only — no layout position or dimension changes on desktop/mobile.
