# Architecture — BLACKANDBREW ERP

> **Version:** 3.1 | **Last Updated:** 2026-05-15 | **Stack:** Next.js 16 + Supabase

---

## 1. Overview

Hybrid PPR architecture: Static Shell (Navigation, Branding) + Dynamic Islands (Real-time data via Supabase).

### Tech Stack

- **Framework:** Next.js 16.2.4 (App Router) + React 19.2.4
- **Database:** Supabase PostgreSQL (Thailand Edge Region)
- **Styling:** Tailwind CSS 4 + PostCSS
- **State:** Zustand (global), React useState (local)
- **i18n:** next-intl v4.11.0 (th/en)
- **DnD:** @dnd-kit/core + sortable
- **Testing:** Vitest + Testing Library
- **Deploy:** Vercel Edge Runtime

---

## 2. Supabase Dual-Client Strategy

| Context | Key | Purpose |
| :--- | :--- | :--- |
| Client Components (`src/lib/supabase.ts`) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Real-time subs, client reads |
| Server Actions (`inventory-actions.ts`) | `SUPABASE_SERVICE_ROLE_KEY` | Bypass RLS for admin ops |

**Security:** `SUPABASE_SERVICE_ROLE_KEY` never has `NEXT_PUBLIC_` prefix — never exposed to browser.

Client singleton config:

```typescript
export const supabase = createClient(url, anonKey, {
  realtime: { params: { eventsPerSecond: 2 } },
  db: { schema: 'public' },
});
```

---

## 3. Route Structure

```text
src/app/
├── page.tsx                     # Root redirect → /th
├── actions/
│   ├── inventory-actions.ts     # Inventory (Service Role)
│   ├── shift-actions.ts         # Shift CRUD & revalidation
│   └── holiday-actions.ts       # Google Calendar sync
└── [locale]/
    ├── layout.tsx               # i18n layout
    ├── page.tsx                 # Command Center
    ├── dashboard/               # Shift overview
    ├── schedule/                # Shift management (DnD)
    ├── inventory/               # Smart inventory (spreadsheet)
    └── maintenance/             # Equipment tracking
```

---

## 4. Data Flow Patterns

### Inventory Edit (Spreadsheet)

```text
onChange → local state → onBlur → optimistic update → supabase.update() → real-time channel
```

### Transaction Recording (Atomic via RPC)

```text
Server Action → supabase.rpc('record_inventory_transaction')
→ Row Lock (FOR UPDATE) → Validate → UPDATE stock → INSERT transaction → RETURN
```

### Transaction History (Two-Step Fetch)

```text
Step 1: SELECT * FROM inventory_transactions
Step 2: SELECT id,name FROM inventory_items WHERE id IN (...)
Step 3: Merge in-memory → return enriched data
```

---

## 5. State Management

| Type | Tool | Scope |
| :--- | :--- | :--- |
| Global UI | Zustand | Sidebar toggle |
| Page-level | useState | Items, columns, modals |
| History | undoStack/redoStack | Inventory undo/redo |
| Persistence | localStorage + `inventory_config` | Column widths/labels |
| Real-time | Supabase Channels | Cross-device sync |

---

## 6. External Integrations

| Service | Auth | Purpose |
| :--- | :--- | :--- |
| Supabase | Anon Key + Service Role | DB, Auth, Real-time |
| Google Calendar API | `GOOGLE_CALENDAR_API_KEY` | Thai holiday sync |
| Vercel | Git deployment | Edge hosting |
