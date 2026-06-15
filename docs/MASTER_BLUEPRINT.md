# Black-and-Brew ERP: MASTER BLUEPRINT [R1]

> Version: 8.6 | Last Updated: 2026-06-15 | Canonical blueprint (root `MASTER_BLUEPRINT.md` is a redirect stub only)

## 🏛️ Architectural Core

The system is built on Next.js 16.2.4 (Turbopack) and Supabase, prioritizing extreme visual consistency, high-fidelity interactions, and robust data persistence.

### 1. Visual Standard: "Pastel Frictionless" (Dual Theme v8.4)

- Color Palette: Minimalist Pastel — light theme uses Morning Latte Cream (`#fdfcf0` via `bg-background`); dark theme uses CSS tokens (`--background`, `--foreground`, `--card`, `--border`). Pastel accent cards (shift types, metrics) keep hex colors in both themes.
- Theme: `next-themes` + Settings page (`/[locale]/settings`) — light / dark / system, persisted as `bb-theme`.
- Pastel Contrast: All pastel accent containers must use `.bb-pastel-surface` (see `PASTEL_SURFACE` in `shift-colors.ts`) so text/icons stay black regardless of theme.
- Typography: ZERO-BOLD POLICY. All text must use `font-normal`. Emphasis is achieved via color intensity or layout, never via font weight.
- Navigation Chips: Category selection is rendered as lightweight, border-rounded Pill-shaped Navigation Chips (`rounded-full px-4 py-2 border font-normal`) featuring decoupled count badges inside `<span>` tags. Active states utilize solid soft black `#000000` with muted white counts, while inactive states utilize transparent backgrounds with delicate grey borders and charcoal text.
- Interactions: Snappy, spring-based animations (Framer Motion).
- Legibility: Theme-aware text on page/modal surfaces (`text-foreground`); pure black (`#000000`) on pastel accent surfaces only (via `bb-pastel-surface`).

### 2. Interaction Engine: "Precision DnD"

- Library: `dnd-kit`.
- Sensors: `PointerSensor` (distance: 5px), `KeyboardSensor`.
- Collision: `closestCorners`.
- Feedback:
  - Row Drag: `scale: 1.02`, `opacity: 0.8`.
  - Card Drag: `scale: 1.05`, `opacity: 0.7`.
  - Z-Index: `100` for active items.
- Physics: Framer Motion `layout` prop with `stiffness: 300`, `damping: 30`.

### 3. Data Integrity: "Service Role Protocol"

- Persistence: All critical database mutations (reordering, stock updates) must bypass RLS using the Supabase Service Role Key via Server Actions.
- Atomic Updates: Use `Promise.all` for batch updates (e.g., reordering entire lists) followed by `revalidatePath`.
- Zero-Display Logic: Numeric 0 renders as empty string `""` in UI; empty input sanitizes to `0` in DB.

### 4. AI Agent: "บรู" (Vercel AI SDK v6)

- Model: `gemini-2.5-flash` via `@ai-sdk/google`.
- Transport: `DefaultChatTransport` (useChat hook) → `POST /api/chat`.
- Architecture: ToolLoopAgent is utilized instead of `streamText` for Server-Side multi-step tool execution. The agent iterates over tool calls and results automatically (`stopWhen: stepCountIs(maxSteps)`).
- Token Optimization: Smart memory window (`MAX_MEMORY_MESSAGES = 8`, `messages.slice(-8)`), per-message char cap 2000, `maxOutputTokens: 1200`, dynamic intent-based system prompt.
- Tools (`src/app/actions/tools/`): `readTable`, `getDailyShifts`, `internetSearchTool` exposed in `/api/chat`; cron-only `weatherTool` + `getDailyReportSourcesTool` in `internal-sources-tools.ts`.
- Deterministic Schedule Path (DEC-068): คำถามตารางงานรายวัน (วันนี้/พรุ่งนี้) short-circuit ผ่าน `fetchDailyShiftsByDate` + `formatScheduleChatResponse` — ไม่พึ่ง LLM สรุปผล ป้องกันคำตอบสั้นผิดพลาด (เช่น "วันนี้ 0")
- Shift Data Source: กะจริงมาจาก `shifts.metadata.location` (6:30, 7:00, 8:00, ลา, ไปสาขา 2, ร้านซักผ้า, วันหยุด) — ห้ามใช้ `start_time` เป็นเวลาเข้างาน
- Security: AI reads via Supabase Service Role isolated tools — read-only data layer.
- Hydration: `AIChatOverlay` uses `isMounted` guard (`useEffect(() => setIsMounted(true), []`) to prevent Math.random prerender errors. Loaded via `next/dynamic ssr:false` in `AIChatWrapper`.
- Branding & UI Polish: Implemented a custom branding logo loaded dynamically via `/ai-agent-logo.svg` inside standard Next.js `<Image />` tags, overriding the generic Lucide `<Bot />` icons in the header, bubble avatars, and thinking indicators for maximum brand coherence.
- UI Enhancements (R0 Standard):
  - Swapped the generic closed-state floating button icon (`MessageCircle`) with the branding logo (inverted to pure white).
  - Scaled up the chat bubble text size to `text-[15px]` using `font-light antialiased` typography parameters for a crisp, ultra-legible screen display while strictly respecting the Zero-Bold Policy (zero bold styling).
  - Enhanced contrast hierarchy by changing secondary sub-headers and loaders from generic transparent black (`text-[#000000]/40`) to a high-density "Deep Coffee" shade (`text-[#1a1a1a]`).
  - Added a click-outside backdrop overlay (`fixed inset-0 z-[198] bg-black/0`) within the `<AnimatePresence>` wrapper to seamlessly close the chat window when empty space is clicked.

### 5. Persistent UI & Session States

- Dashboard Date Range Persistence: User-selected start/end dates for the dashboard live shift list are persisted in browser cookies (`dashboard_start_date` and `dashboard_end_date`) for 1 year (Max-Age `31536000`, `SameSite=Lax`).
- Data Resolution Chain: Dates are resolved hierarchically: URL parameters take precedence, followed by saved cookies, and finally defaulting to the current week's Monday-to-Sunday range. This allows server-side queries to render persistent dates without client-side hydration layout shifts.

### 6. Schedule Grid & Summary Computations

- Strict Shift Filtering & Deduplication Logic:
  - Daily summary rows strictly count only employees having shifts matching `6:30`, `7:00`, or `8:00`.
  - Inactive or deleted employees loaded via database history are strictly filtered out by cross-referencing `orderedProfileIds` to prevent total count bloating.
  - Set-based deduplication (`new Set(...).size`) is integrated to ensure each active employee is counted at most once per day, matching absolute scheduling realities.
  - Non-work shifts like `ร้านซักผ้า` or `ไปสาขา 2` are visually retained in cells for operational scheduling, but are completely filtered out from summary row calculations.
  - Sinks directly into `ScheduleClient.tsx` grid sum calculations to maintain absolute scheduling accuracy and data parity.
- Direct Sync Strategy (v3.24):
  - To prevent state destruction during dynamic revalidation or router refresh, `ScheduleClient.tsx` implements an unconditional `useEffect` block that directly synchronizes server props (`initialProfiles`, `initialShifts`, `initialHolidays`, and `initialDateStr`) into their respective React states (`profiles`, `shifts`, `holidays`, `currentDate`, and `orderedProfileIds`).
  - This avoids fragile conditional loops and blocking refs, ensuring the client UI always renders the exact server-resolved database source-of-truth.
- High-Fidelity PNG Export:
  - A client-side "บันทึกรูปภาพ" action integrates the `html-to-image` library loaded via dynamic browser-only imports to prevent Next.js SSR build errors.
  - Scales the capture by `2` (pixelRatio: 2) to ensure high-definition text output for print or share.
  - Targets the inner `min-w-[900px] h-fit` grid wrapper `id="blackandbrew-schedule-table"` to crop exactly to the content dimensions, completely eliminating extra white space at the bottom of the exported image.
  - Aligns Holiday row and Day headers inside the scrolling container so they scroll and export uniformly as a single calendar block.
  - Resets styles (margin/padding: 0, border: none, boxShadow: none) during render for a clean tight crop.

### 7. Server-Side Security Gate & Anti-Brute Force (R1 Standard)

- Security Gate: The authentication PIN checks are migrated 100% to the server-side via Server Actions in `src/app/actions/auth.ts`.
- Environment Isolation: The environment variable is stored as a secret `APP_PIN` (without `NEXT_PUBLIC_`) so Next.js never leaks the key to client bundles.
- Session Hardening & Tab Isolation: Client-side authentication checks strictly enforce `sessionStorage` tab isolation to prevent credentials persistence across tab/browser lifecycles. Any access on a fresh tab or a fresh browser session will immediately trigger the Security PIN Gate. Upon successful verification, the state is stored in `sessionStorage.getItem('bb_auth_pin_verified')`. The server action `verifyPin` also sets a secure, HTTP-Only, `SameSite=Strict` cookie (`bb_auth_pin_verified`) for supplementary server-side API requests.
- Type-Guarded LocalStorage Recovery: To prevent client-side injection attacks, corruption, or UI crashes, any state deserialized from `localStorage` (such as column widths or drag orders) must be validated through the Type Validation Engine. Keys and value types, ranges, bounds, and array lengths must be checked (e.g. `typeof key === 'string' && typeof val === 'number' && val > 0 && val < 2000`) before state is updated.
- Anti-Brute Force (Rate Limiter): If an operator enters the wrong PIN 5 times in a row, the system enforces a strict 15-minute lockout screen (`localStorage` persisted to prevent page refresh bypass). The lockout timer renders dynamically with standard `font-normal` and `antialiased` typography on Morning Latte Cream (#fdfcf0).

### 8. Fetch-after-Save Strategy & Latency Mitigation (v3.23)

- Database Uniqueness Assurance: To guarantee database uniqueness without schema constraints, the `saveShift` Server Action executes an atomic delete-then-insert maneuver utilizing `supabaseAdmin`. This ensures that no duplicate shift records exist for a single employee on a single day.
- Latency Debounce & Fetch Padding:
  - A short 500ms delay (`new Promise(resolve => setTimeout(resolve, 500))`) is introduced on save to allow the database to clear transaction latencies before fetching updated values.
  - The fetch range for weekly shifts is widened by 1 day on both ends (`startRange` and `endRange` derived from `weekDays`) to completely eliminate edge-of-timezone overflow issues, preventing shifts from silently disappearing from the grid UI.
  - Replaces all legacy client-side rollback mechanisms to guarantee absolute sync with the Supabase source-of-truth.

### 9. Next.js Config & Build Compatibility

- NextConfig cacheComponents compatibility: Route-level configurations such as `export const dynamic = 'force-dynamic';` are strictly avoided inside layout/page definitions because they conflict with custom configurations such as `nextConfig.cacheComponents` in Turbopack. Route freshness is instead maintained by applying `cache: 'no-store'` inside fetches and utilizing server actions for path revalidation.

### 10. Progressive Web App (PWA) & Mobile-First Standards (v6.1)

- Dynamic App Manifest (`src/app/manifest.ts`): Defines metadata, standalone display mode, app icons at `/images/notification-icon.png` (192×192) and `/images/notification-icon-512.png` (512×512), theme color `#000000`, background `#ffffff`.
- Service Worker Cache Strategy (`public/sw.js`):
  - Implements a Network-First strategy with aggressive cache-busting to ensure that dynamically modified rosters, schedules, and inventory levels are always up-to-date while offering offline baseline rendering.
  - Skips waiting on install and takes immediate control of clients.
- PWA Registry Component (`src/components/PwaRegister.tsx`): Integrates within the main App Shell to quietly register the Service Worker in client environments without interrupting user flows.
- Full-Width Clickable Input Accessibility (Global Interaction Rules):
  - All date pickers across the app are wrapped in parent containers that render their entire horizontal hitbox interactive. Clicking anywhere within the border triggers the popover calendar.
- Responsive Calendar & Centered Mobile Date Modal:
  - Leverages Framer Motion popovers styled as clean minimalist capsules.
  - On mobile viewports (`max-md:`), the calendar transitions dynamically into a fixed centered modal backdrop layer with a tap-to-close overlay, ensuring seamless touch targeting (Fat-finger protection).
- iOS Safe Zones Padding:
  - Bottom menu controllers and modal panels leverage iOS-specific home indicator safe area parameters using Tailwind utilities: `max-md:pb-[calc(1.5rem+env(safe-area-inset-bottom))]` to avoid overlapping system navigation controls.

## 📂 Module Status

| Module | Route | Status |
| --- | --- | --- |
| Command Center | `/[locale]` | Active |
| Inventory | `/[locale]/inventory` | Active — DnD + Stock RPC |
| Stock Count | `/[locale]/inventory/count` | Active |
| Staff Dashboard | `/[locale]/dashboard` | Active |
| Schedule | `/[locale]/schedule` | Active — DnD |
| Maintenance | `/[locale]/maintenance` | Active |
| Sales | `/[locale]/sales` | Active |
| Market Insights | `/[locale]/market-insights` | Active |
| AI Assistant (บรู) | Global overlay | Active — AI SDK v6 |
| PIN Auth | PinGateway | Active — full + read-only |

## 🛠️ Global Rules

- Naming: Strictly use `inventory_item_id` for transaction foreign keys.
- Revalidation: Call `revalidateAppPaths` after any cross-module mutation.
- Testing: Follow TDD SOP for all new logic.
- AI Hydration: `AIChatOverlay` must include `isMounted` guard + be loaded via `next/dynamic` with `ssr: false`.
- AI SDK: Always use `providerOptions.google.generationConfig.maxOutputTokens`. Never use `maxTokens`.
- Zero-Bold: No `font-bold` or `font-semibold` anywhere. Verified via grep scan on every closing.
- Storage Safety: Never parse raw values from `localStorage` without Type Validation Engine checking.

## Environment Variables

Authoritative list: [`.env.example`](../.env.example). Keys actually read in `src/`:

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | PUBLIC | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | PUBLIC | Anon key (RLS client) |
| `SUPABASE_SERVICE_ROLE_KEY` | SECRET | Server Actions, AI tools, cron |
| `APP_PIN` | SECRET | Full-access PIN |
| `NEXT_PUBLIC_STORE_LAT` / `NEXT_PUBLIC_STORE_LON` | PUBLIC | Store coordinates |
| `GOOGLE_GENERATIVE_AI_API_KEY` | SECRET | Gemini — `@ai-sdk/google` (AI Chat, Market Insights) |
| `TAVILY_API_KEY` | SECRET | `internetSearchTool` |
| `OPENWEATHER_API_KEY` | SECRET | `/api/weather`, daily-report, market-insights |
| `GOOGLE_CALENDAR_API_KEY` | SECRET | OPTION — holiday sync |
| `GOOGLE_PLACES_API_KEY` | SECRET | OPTION — Market Insights v2 nearby cafés |
| `LINE_CHANNEL_ACCESS_TOKEN` | SECRET | LINE Messaging API push |
| `LINE_GROUP_ID` | SECRET | Cron recipient (preferred) |
| `LINE_TARGET_RECIPIENT_ID` | SECRET | Cron recipient fallback |
| `CRON_SECRET` | SECRET | Protects `GET /api/daily-report` |

Read-only PIN via `APP_READ_ONLY_PIN` env (`src/lib/security/read-only-pin.ts`); dev fallback `111222`.
