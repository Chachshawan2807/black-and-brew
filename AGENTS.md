<!-- markdownlint-disable MD025 -->
# Agent Rules — BLACKANDBREW ERP

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

**Next.js skill:** `.agents/skills/next-best-practices/SKILL.md` — App Router file conventions, RSC boundaries, async APIs, metadata, route handlers. Pair with `vercel-react-best-practices` for performance.

**Caching vs ERP sync:** Supabase real-time / optimistic UI wins over aggressive route caching. Do not cache inventory, sales, or editable grid data in ways that delay post-mutation freshness unless explicitly invalidated on every write.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-structure-standard -->

## PROJECT STRUCTURE (Next.js colocation)

This is a **Next.js App Router** ERP — not a Vite/CRA SPA. Do **not** introduce top-level `features/` or `services/` folders or mass-move legacy files to match generic React tutorials. Map domain modules to `app/`, `lib/`, and `app/actions/` instead.

**Skill:** `.agents/skills/next-best-practices/SKILL.md` — file conventions, RSC boundaries, private folders.

### Folder roles

| Concern | Location | Examples |
| ------- | -------- | -------- |
| Routes & page shells | `src/app/[locale]/<feature>/` | `inventory/page.tsx`, `schedule/ScheduleClient.tsx` |
| Feature-only UI (new code) | `src/app/[locale]/<feature>/_components/` | Private folder — not a URL segment |
| Shared UI (2+ features) | `src/components/` | `components/ui/`, `components/sidebar/`, `components/auth/` |
| Domain logic (no UI) | `src/lib/` or `src/lib/<domain>/` | `lib/schedule/`, `lib/inventory-stock.ts`, `lib/shift-colors.ts` |
| Server mutations | `src/app/actions/<domain>-actions.ts` | `inventory-actions.ts`, `shift-actions.ts` |
| HTTP API | `src/app/api/` | `api/chat/route.ts`, `api/weather/route.ts` |
| Cross-feature hooks | `src/hooks/` | `useScheduleUndo.ts`, `use-inventory-notifications.ts` |
| Feature-scoped React context | `src/contexts/` | `InventoryRealtimeContext.tsx` |
| Shared types | `src/types/` | `types/index.ts` |
| Tests | `src/test/` | `<name>.test.ts`, `<name>.test.tsx` |

### Separation of concerns

- **UI** (`*Client.tsx`, components) — render, local state, optimistic updates, event handlers. Prefer Server Actions for mutations; avoid direct Supabase writes from client when an action already exists.
- **Domain logic** (`lib/`) — pure helpers, formatting, validation, query builders, undo/sync helpers. No React hooks unless the module is explicitly client-only.
- **Data layer** — Server Actions + `lib/supabase-server.ts` on the server; `lib/supabase.ts` + session helpers on the client. Auth checks live **inside** each Server Action (see next-best-practices).
- **Do not** duplicate the same mutation in both a client component and a Server Action.

### Colocation rules (new code)

1. **Default:** colocate with the route — `page.tsx`, `*Client.tsx`, `loading.tsx`, feature-only components under `_components/`.
2. **Promote to shared** only when used by **two or more** features (e.g. `ClickableDatePicker` → `components/ui/`).
3. **No drive-by moves** — never rename/move unrelated files while fixing a bug or adding a feature.

### Server vs client boundary

- Keep **`'use client'`** as low in the tree as possible — spreadsheet grids, FABs, undo, realtime, DnD.
- Server Components / `page.tsx` — initial fetch, metadata, pass serializable props only (minimize RSC payload).
- Route-specific types — colocate as `types.ts` next to the feature (e.g. `dashboard/types.ts`, `inventory/types.ts`).

### Feature examples in this repo

```text
home/       → app/[locale]/page.tsx
              app/[locale]/_components/LiveStatusTracker.tsx

inventory/  → app/[locale]/inventory/InventoryClient.tsx
              app/[locale]/inventory/_components/* (FAB, modals, quick action bar)
              app/actions/inventory-actions.ts
              lib/inventory-*.ts, contexts/InventoryRealtimeContext.tsx

dashboard/  → app/[locale]/dashboard/page.tsx
              app/[locale]/dashboard/_components/* (LiveShiftList, MonthlyRoster, …)

schedule/   → app/[locale]/schedule/ScheduleClient.tsx
              app/[locale]/schedule/_components/* (ShiftSettingsModal, ScheduleToolbar)
              app/actions/shift-actions.ts
              lib/schedule/*, hooks/useScheduleUndo.ts

settings/   → app/[locale]/settings/page.tsx
              app/[locale]/settings/_components/*

sales/      → app/[locale]/sales/SalesClient.tsx
              app/[locale]/sales/_components/*
              app/actions/sales-actions.ts
```

### Agent checklist (structure)

- [ ] New file placed in the closest matching row in the folder table above
- [ ] Mutations go through `app/actions/`, not ad-hoc client Supabase updates
- [ ] No new top-level `features/` or `services/` directories
- [ ] No mass file moves without explicit user request

<!-- END:project-structure-standard -->

<!-- BEGIN:modern-web-baseline-standard -->

## FRONTEND & MOBILE UI — UNIFIED STANDARD

**This project's Baseline target is Baseline Widely available.**

Use interoperable web platform features that major browsers have supported for at least ~30 months. Prioritize maximum stability for staff on phones and tablets across mixed device generations. Do not ship Baseline Newly or Limited features as the only code path without a documented fallback or progressive enhancement.

**Authoritative skill:** `.cursor/skills/chrome-modern-web-guidance/SKILL.md` — read before any HTML/CSS/clientside JS UI work. For non-trivial features, retrieve full guides:

```text
npx -y modern-web-guidance@latest search "<use case>"
npx -y modern-web-guidance@latest retrieve "<guide-id>"
```

Sources: [Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance) · [Chrome 149 release notes](https://developer.chrome.com/release-notes/149)

### Rule priority (when guidance conflicts)

Apply in order — higher wins:

1. **ERP domain rules** — spreadsheet grids, pastel shift colors, Supabase sync, numeric/undo rules, data symmetry (sections in this file).
2. **chrome-modern-web-guidance** — `.cursor/skills/chrome-modern-web-guidance/SKILL.md` + **modern-web-guidance** (`npx modern-web-guidance search/retrieve`) for Baseline Widely available, native overlays, mobile layout.
3. **React & Next.js skills** — `next-best-practices`, `vercel-react-best-practices`, `shadcn`, `webapp-testing` in `.agents/skills/` for App Router conventions, performance, components, and testing — **never** override ERP spreadsheet/pastel rules or Supabase sync freshness.
4. **Design review skills** — `web-design-guidelines`, `impeccable` (sub-command `critique` only), `ui-ux-pro-max` — review/polish on existing UI; must stay minimalist + time-based pastel. Do not use impeccable `bolder` / `delight` / `overdrive` when they conflict with ERP tone.

When React, Next.js, or design skills suggest modals for grid edits, aggressive caching of live ERP data, decorative UI, luxury/bold aesthetics, or non-pastel surfaces, **reject** and follow ERP + chrome-modern-web-guidance instead.

### Modern platform (no deprecated code)

- Prefer native HTML/CSS/JS over libraries that duplicate browser behavior (custom modals, tooltip plugins, JS accordions).
- Overlays: `<dialog>` + `.showModal()` for modals; `popover` for menus/tooltips; `<details>` for inline disclosure — see skill for matrix.
- Layout: **container queries** for components; viewport `@media` for page-level only; mobile sheets use `svh` / `dvw`, not bare `100vh`.
- Forms: `:user-invalid` / `:user-valid` after interaction; sync `aria-invalid`; correct `autocomplete` tokens — not `:invalid` on first paint.
- Viewport: `<meta name="viewport" content="width=device-width, initial-scale=1.0">` — **never** disable zoom (`user-scalable=no`).
- Respect `prefers-reduced-motion`, `prefers-color-scheme`, `prefers-contrast`.
- Performance: explicit `width`/`height` on images; `fetchpriority="high"` on LCP only; break up long tasks for INP; `loading="lazy"` off-screen only.

### Theme, pastel & visual identity (with dark mode)

- **Theme provider:** `next-themes` — `storageKey="bb-theme"`, `attribute="class"`, `defaultTheme="system"` (`/[locale]/settings`).
- **Non-pastel surfaces:** CSS tokens only — `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`. Never `bg-white`, `bg-[#fdfcf0]`, or `text-black` on standard surfaces.
- **Pastel shift/time cards:** time-based pastel hex only (e.g. 6:30 = light green). Always append `bb-pastel-surface` / `PASTEL_SURFACE` (`shift-colors.ts`) so text/icons stay **black** on pastel in both themes.
- **Headings on pastel:** pastel containers need `.bb-pastel-surface` — global `h1–h6` uses `var(--foreground)` (white in dark mode).
- **Icons on dark headers:** `dark:invert` for dark SVGs (e.g. AI chat logo).
- **UI tone:** Minimalist, outcome-first, data symmetry (see UI/UX PRO MAX below).

### Touch, mobile & clickable inputs

- **Full hitbox:** date pickers and touch-critical inputs — entire container opens the control, not just the icon. Shared component or Tailwind utility pattern.
- **Safe areas:** `env(safe-area-inset-*)` on fixed FABs, bottom bars, notches.
- **Navigation drawer / mobile menu:** follow `navigation-drawer` pattern in chrome-modern-web-guidance skill (`popover="manual"`, scroll-snap, `inert` on background).
- **Semantic HTML + keyboard:** landmarks, skip link, `inert` when overlays open — Baseline Widely available patterns only.

### Spreadsheet-style grids (inventory & editable tables)

- Native `<input>` in `<td>` — no modals or Edit buttons for simple cell edits.
- `onChange` for instant UI; `onBlur` / `Enter` for Supabase `.update()`.
- No action/delete columns unless explicitly requested — maximize horizontal space on mobile.
- Numeric rules: sanitize empty → `0` for DB; display `0` as `""` in UI; undo capture on focus (see Error Handling).

### Frontend pre-ship checklist

- [ ] Baseline Widely available verified; fallbacks if using newer APIs
- [ ] Theme tokens on surfaces; `bb-pastel-surface` on pastel cards
- [ ] Clickable full-width hitboxes on date/touch inputs
- [ ] Spreadsheet mode: inline inputs, auto-save, no unnecessary modals
- [ ] Mobile: viewport meta, touch targets, safe-area on fixed UI
- [ ] No deprecated patterns from chrome-modern-web-guidance skill table

<!-- END:modern-web-baseline-standard -->

<!-- BEGIN:ui-ux-pro-max-skill -->

## UI/UX PRO MAX STANDARDS

- **Skill:** `.agents/skills/ui-ux-pro-max/SKILL.md` — design intelligence (lowest design tier; see rule priority)
- **Design review:** `.agents/skills/web-design-guidelines/SKILL.md` (spacing, typography, interaction, a11y) · `.agents/skills/impeccable/SKILL.md` with **`critique`** sub-command for structured UI review before ship
- **Constraint:** ทุกการสร้าง UI ใน BLACKANDBREW ERP ต้องเป็น Minimalist และใช้ Pastel Palette ตามเงื่อนไขเวลาเดิมเท่านั้น (เช่น 6:30 = light green)
- **Design Logic:** เน้นผลลัพธ์ที่ถูกต้องเชิงระบบ (Outcome-First) และความสมมาตรของข้อมูล
- **Update:** `npx skills add nextlevelbuilder/ui-ux-pro-max-skill@ui-ux-pro-max -y`
<!-- END:ui-ux-pro-max-skill -->
<!-- BEGIN:dark-theme-standard -->

## DARK THEME & THEME TOKEN STANDARD

> Merged context: **FRONTEND & MOBILE UI — UNIFIED STANDARD** (Baseline Widely available + theme/pastel rules).

- **Theme Provider:** `next-themes` via `ThemeProvider` — `storageKey="bb-theme"`, `attribute="class"`, `defaultTheme="system"`. User selects light/dark/system on `/[locale]/settings`.
- **Page/modal surfaces:** Use CSS variable tokens — `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`. Never hardcode `bg-[#fdfcf0]`, `bg-white`, or `text-black` on non-pastel surfaces.
- **Pastel accent cards:** Keep shift/time pastel hex backgrounds (e.g. 6:30 = light green). Always append `bb-pastel-surface` (via `PASTEL_SURFACE` in `shift-colors.ts`) so text/icons stay **black** on pastel in both themes.
- **Headings on pastel:** Global `h1–h6 { color: var(--foreground) }` makes headings white in dark mode — pastel containers must use `.bb-pastel-surface` to override back to black.
- **Logos/icons on dark:** Use `dark:invert` where a dark SVG must appear on dark headers (e.g. AI chat logo).
<!-- END:dark-theme-standard -->
<!-- BEGIN:clickable-input-rules -->

## GLOBAL UI INTERACTION RULES

> Merged context: **FRONTEND & MOBILE UI — UNIFIED STANDARD** (touch/mobile + clickable inputs).

- **Date Picker Accessibility:** สำหรับ Input ประเภทวันที่ (Date Picker) ทั้งหมดในโปรเจกต์ ต้องทำให้พื้นที่ทั้งหมดของ Input Container สามารถคลิกเพื่อเรียกปฏิทินขึ้นมาได้ (Full-width clickable area) ไม่จำกัดเฉพาะการคลิกที่ไอคอน
- **Implementation Style:** ใช้สไตล์การเขียนแบบ Shared Component หรือ Tailwind Utility ที่ขยาย Hitbox ให้ครอบคลุมทั้งกรอบ Input เพื่อให้พนักงานใช้งานได้สะดวกบนทุกอุปกรณ์
<!-- END:clickable-input-rules -->

<!-- BEGIN:data-sync-standard -->

## DATA SYNCHRONIZATION STANDARD

- **Database Rules:** Any data changes (Add, Update, Delete) connected to Supabase must trigger an immediate, automatic update to the database and reflect in the UI state without manual refresh.
- **Optimistic UI:** Always update the local state using functional updates (`setProfiles(prev => [...prev, newProfile])`) immediately after a successful database response or simultaneously if the risk of failure is low, ensuring the UI remains responsive.

<!-- BEGIN:spreadsheet-ui-maintenance -->

## SPREADSHEET-STYLE UI MAINTENANCE (Editable Grid)

> Merged context: **FRONTEND & MOBILE UI — UNIFIED STANDARD** (spreadsheet grids on mobile/tablet).

- **Direct Cell Editing:** Do not use modals or "Edit" buttons for simple grids (e.g., Inventory). Use native `<input>` tags rendered directly in `<td>` elements.
- **Auto-Save:** Inputs must use `onChange` for instant local state reflection and `onBlur`/`onKeyDown={Enter}` for firing background `.update()` calls to Supabase.
- **No Action Columns:** Action columns (like "Delete") should be avoided or completely removed in spreadsheet modes to maximize horizontal space. To delete, users might clear the row or use a separate bulk-action tool, unless explicitly requested otherwise.
<!-- END:spreadsheet-ui-maintenance -->

<!-- BEGIN:error-handling-standard -->

## ERROR HANDLING & SYSTEMATIC DEBUGGING STANDARD

- **Root Cause First:** NO FIXES WITHOUT ROOT CAUSE INVESTIGATION. Follow `systematic-debugging` phases (Phase 1: Root Cause -> Phase 2: Pattern -> Phase 3: Hypothesis -> Phase 4: Fix).
- **Failing Test First:** Every bug fix MUST start with a failing test case that reproduces the issue.
- **Supabase Fetches & Mutations:** Always wrap Supabase calls in try/catch blocks.
- **Detailed Logging:** In the catch block or when `error` is returned from Supabase, you must log the precise details: `if (error) { console.error('Supabase Error:', error.message, error.details); throw error; }`.
- **Graceful Fallbacks:** Handle empty or null data gracefully (e.g., `setItems(data || [])`). Do not allow the UI to crash if data is missing.
- **Numeric Data Sanitization:** Never send an empty string `""` to a `numeric` or `integer` column in Supabase. Always sanitize inputs: `const sanitized = value === "" ? 0 : Number(value)`.
- **Numeric Formatting & Undo-Sync Standard:**
  - Always strip leading zeros from integer inputs using `replace(/^0+(?=\d)/, '')`.
  - If current value is 0 and user types 1-9, replace the 0 with that digit.
  - **1-Click Undo Persistence Standard:** Capture state on focus or before any update to ensure undo works in a single click. Always `await syncFullStateToDB` in undo/redo.
- **Zero-Display UI Logic:** Numeric values of 0 must be rendered as empty strings `""` for a cleaner UI, while maintaining 0 in the database.
<!-- END:error-handling-standard -->
<!-- END:data-sync-standard -->

<!-- BEGIN:superpowers-sop -->

## CORE DEVELOPMENT SOP (Superpowers)

- **TDD (Test-Driven Development):** NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST. Follow Red-Green-Refactor religiously. Use `.agents/skills/webapp-testing/SKILL.md` for test patterns when helpful.
- **Verification:** Always verify "RED" (test fails) and "GREEN" (test passes) before proceeding.
- **Documentation Reference:** Full SOP details are available in [SOP.md](file:///c:/Users/chach/.gemini/antigravity/scratch/black-and-brew/docs/SOP.md).
<!-- END:superpowers-sop -->

<!-- BEGIN:skills-registry -->

## PROJECT SKILLS

| Skill | Path | หน้าที่ |
| ------- | ------ | -------- |
| chrome-modern-web-guidance | `.cursor/skills/chrome-modern-web-guidance/SKILL.md` | Baseline frontend/mobile ของโปรเจกต์ (Baseline Widely available) |
| modern-web-guidance | `.agents/skills/modern-web-guidance/SKILL.md` | ค้นหา/ดึง best practice เว็บสมัยใหม่จาก Google Chrome |
| next-best-practices | `.agents/skills/next-best-practices/SKILL.md` | App Router, RSC boundaries, async APIs, metadata |
| vercel-react-best-practices | `.agents/skills/vercel-react-best-practices/SKILL.md` | React/Next performance — waterfalls, bundle, re-renders |
| shadcn | `.agents/skills/shadcn/SKILL.md` | shadcn/ui + Tailwind — ติดตั้ง, theme, compose components |
| web-design-guidelines | `.agents/skills/web-design-guidelines/SKILL.md` | Vercel Web Interface Guidelines — spacing, type, a11y |
| impeccable | `.agents/skills/impeccable/SKILL.md` | UI critique/review (`critique` sub-command) — ก่อน ship |
| webapp-testing | `.agents/skills/webapp-testing/SKILL.md` | Unit/integration/E2E testing patterns (Vitest, Playwright) |
| ui-ux-pro-max | `.agents/skills/ui-ux-pro-max/SKILL.md` | ออกแบบ/รีวิว UI·UX — ลำดับต่ำสุดในกลุ่ม design |
| security-review | `.agents/skills/security-review/SKILL.md` | รีวิวช่องโหว่ security ในโค้ด (OWASP) |
| google-cloud-waf-security | `.agents/skills/google-cloud-waf-security/SKILL.md` | แนวทาง security บน Google Cloud |
| gemini-api | `.agents/skills/gemini-api/SKILL.md` | ใช้ Gemini API / Vertex AI (SDK `@google/genai`) |
| **AgentSkillOS runbooks** | `.agent-skills/skills/*/SKILL.md` | ทักษะรันซ้ำของโปรเจกต์ — `npm run skill:list` · `npm run skill:run <id>` |

**AgentSkillOS Runbooks:** ทักษะโปรเจกต์ (clean cache, smoke check, db wrappers) อยู่ใน `.agent-skills/skills/` แยกจาก `.agents/skills/` (third-party). ลงทะเบียนใน `.agent-skills/registry.json` · blueprint ใน `.agent-skills/README.md`

**ลำดับความสำคัญเมื่อขัดกัน:** ERP domain rules → chrome-modern-web-guidance → React & Next.js skills → design review skills (`web-design-guidelines`, `impeccable` critique) → ui-ux-pro-max

**อัปเดต skills:** `npx skills add <owner/repo@skill> -y` (เช่น `vercel-labs/agent-skills@web-design-guidelines`, `pbakaus/impeccable@impeccable`)

<!-- END:skills-registry -->
<!-- BEGIN:codebase-memory-mcp-standard -->

## CODEBASE MEMORY (codebase-memory-mcp)

- **Primary graph:** MCP server codebase-memory-mcp (local SQLite knowledge graph)
- **Setup:** See `.cursor/mcp.json.example`; install binary from [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp)
- **Query first:** Use MCP tools (`search_graph`, `trace_path`, `query_graph`) before broad grep/file reads
- **After code changes:** Re-index project via MCP ingest when structural navigation is needed
- **Removed:** graphify is **not** used in this project — do not install, run, or regenerate `graphify-out/`
<!-- END:codebase-memory-mcp-standard -->
