<!-- markdownlint-disable MD025 -->
# Agent Rules — BLACKANDBREW ERP

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:modern-web-baseline-standard -->

## FRONTEND & MOBILE UI — UNIFIED STANDARD

**This project's Baseline target is Baseline Widely available.**

Use interoperable web platform features that major browsers have supported for at least ~30 months. Prioritize maximum stability for staff on phones and tablets across mixed device generations. Do not ship Baseline Newly or Limited features as the only code path without a documented fallback or progressive enhancement.

**Authoritative skill:** `.cursor/skills/chrome-modern-web-guidance.md` — read before any HTML/CSS/clientside JS UI work. For non-trivial features, retrieve full guides:

```text
npx -y modern-web-guidance@latest search "<use case>"
npx -y modern-web-guidance@latest retrieve "<guide-id>"
```

Sources: [Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance) · [Chrome 149 release notes](https://developer.chrome.com/release-notes/149)

### Rule priority (when guidance conflicts)

1. **ERP domain rules** (spreadsheet grids, pastel shift colors, Supabase sync) win in their context.
2. **Baseline Widely available** — no deprecated or single-engine-only APIs without explicit approval.
3. **Project theme tokens** — never hardcode surface colors that break dark mode.
4. **Modern Web Guidance** — native `<dialog>`, Popover API, container queries, `:user-invalid`, etc. over legacy JS libraries.

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

- **Import Skill:** <https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git>
- **Constraint:** ทุกการสร้าง UI ใน BLACKANDBREW ERP ต้องเป็น Minimalist และใช้ Pastel Palette ตามเงื่อนไขเวลาเดิมเท่านั้น (เช่น 6:30 = light green)
- **Design Logic:** เน้นผลลัพธ์ที่ถูกต้องเชิงระบบ (Outcome-First) และความสมมาตรของข้อมูล
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

- **Writing Plans:** Use the `writing-plans` skill for any task with >3 steps. Save to `docs/plans/`. No placeholders.
- **TDD (Test-Driven Development):** NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST. Follow Red-Green-Refactor religiously.
- **Verification:** Always verify "RED" (test fails) and "GREEN" (test passes) before proceeding.
- **Documentation Reference:** Full SOP details are available in [SOP.md](file:///c:/Users/chach/.gemini/antigravity/scratch/black-and-brew/docs/SOP.md).
<!-- END:superpowers-sop -->

<!-- BEGIN:graphify-standard -->

## KNOWLEDGE GRAPH (graphify)

- **Location:** `graphify-out/` — `graph.json`, `GRAPH_REPORT.md`, `graph.html`
- **Query first:** For codebase questions, run `graphify query "<question>"` before broad grep or raw file reads.
- **After code changes:** Run `graphify update .` from the project root (AST-only, no API cost).
- **Navigation:** Use `graphify path "<A>" "<B>"` for relationships; `graphify explain "<concept>"` for focused concepts.
<!-- END:graphify-standard -->
