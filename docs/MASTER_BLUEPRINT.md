# Black-and-Brew ERP: MASTER BLUEPRINT [R1]

> Version: 9.2 | Last Updated: 2026-07-12 | Canonical blueprint (root `MASTER_BLUEPRINT.md` is a redirect stub only)

## Architectural Core

The system is built on Next.js 16.2.4 (Turbopack) and Supabase, prioritizing visual consistency, high-fidelity interactions, and robust data persistence.

### 1. Visual Standard: Pastel Frictionless (Dual Theme)

- Color Palette: Minimalist Pastel — light theme uses Morning Latte Cream (`#fdfcf0` via `bg-background`); dark theme uses CSS tokens (`--background`, `--foreground`, `--card`, `--border`). Pastel accent cards keep hex colors in both themes.
- Theme: `next-themes` + Settings (`/[locale]/settings`) — light / dark / system, persisted as `bb-theme`.
- Pastel Contrast: Pastel containers must use `.bb-pastel-surface` (`PASTEL_SURFACE` in `shift-colors.ts`) so text/icons stay black in both themes.
- Typography: ZERO-BOLD POLICY — `font-normal` only; emphasis via color or layout.
- Navigation Chips: Pill chips (`rounded-full px-4 py-2 border font-normal`) with count badges; active = solid `#000000`.
- Interactions: Framer Motion spring animations.
- Legibility: Theme tokens on page/modal surfaces; `#000000` only on pastel accents.

### 2. Interaction Engine: Precision DnD

- Library: `dnd-kit` — `PointerSensor` (distance: 5px), `KeyboardSensor`, `closestCorners`.
- Feedback: row `scale: 1.02` / `opacity: 0.8`; card `scale: 1.05` / `opacity: 0.7`; z-index `100`.
- Physics: Framer Motion `layout` with `stiffness: 300`, `damping: 30`.

### 3. Data Integrity: Service Role Protocol

- Critical mutations use Supabase Service Role via Server Actions.
- Batch updates via `Promise.all` + `revalidatePath`.
- Zero-Display: UI shows `""` for numeric 0; empty input sanitizes to `0` in DB.
- Count policy: `exact_count` scores accuracy; `sufficiency_check` skips scoring and uses manual `order_qty`.

### 4. AI Agent: บรู (Vercel AI SDK v6)

- Model: `gemini-2.5-flash` via `@ai-sdk/google`.
- Transport: `DefaultChatTransport` → `POST /api/chat`.
- Architecture: ToolLoopAgent (`stopWhen: stepCountIs(maxSteps)`).
- Token budget: `MAX_MEMORY_MESSAGES = 8`, char cap 2000, `maxOutputTokens: 1600`, `maxSteps` up to 7.
- Tools: `getDailyShifts`, `getStoreStatus`, `getSalesSummary`, `getInventoryLedger`, `getInventoryItemDetails`, `readTable`, `internetSearchTool` (Tavily) in `/api/chat`.
- Deterministic short-circuits: daily schedule (DEC-068), upcoming maintenance, low-stock PO summary, sales, holidays, store status (multi-turn query text).
- Live screen context: client sends `clientContext` with route-preferred tools; route sanitizes and injects into the system prompt.
- Shift labels come from `shifts.metadata.location` — never treat `start_time` as the shift name.
- Security: Service Role read-only tools; full PIN session required (read-only kiosk rejected).
- Hydration: `AIChatOverlay` `isMounted` guard; `next/dynamic` with `ssr: false`.
- Branding: `/ai-agent-logo.svg` via `<Image />` (`dark:invert` on dark headers when needed).

### 5. Persistent UI & Session States

- Dashboard date range cookies: `dashboard_start_date` / `dashboard_end_date` (1 year, `SameSite=Lax`).
- Resolution: URL params → cookies → current week Monday–Sunday.

### 6. Schedule Grid & Summary Computations

- Summary counts only `6:30` / `7:00` / `8:00` shifts; dedupe by employee; filter via `orderedProfileIds`.
- Non-work locations (`ร้านซักผ้า`, `ไปสาขา 2`) stay visible but are excluded from summary totals.
- `ScheduleClient.tsx` syncs server props into state so UI matches the DB source of truth.
- PNG export: dynamic `html-to-image` (`pixelRatio: 2`) targeting `#blackandbrew-schedule-table`.

### 7. Server-Side Security Gate & Anti-Brute Force

- PIN verification in `src/app/actions/auth.ts`; `APP_PIN` is server-only.
- Client: `sessionStorage` tab isolation; server: httpOnly cookies (`bb_auth_pin_verified`, `bb_auth_read_only`, `bb_session_fp`).
- Passkeys: `passkey-actions.ts` → `device_passkeys` after PIN-verified registration.
- Validate `localStorage` payloads before applying; 5 failed PINs → 15-minute lockout.

### 8. Fetch-after-Save Strategy

- `saveShift`: atomic delete-then-insert via admin client.
- ~500ms post-save delay before refetch; weekly range padded ±1 day for timezone edges.

### 9. Next.js Config & Build Compatibility

- Avoid route-level `export const dynamic = 'force-dynamic'` when it conflicts with `cacheComponents`. Prefer `cache: 'no-store'` and Server Action revalidation.

### 10. PWA & Mobile-First

- Manifest: `src/app/manifest.ts` — icons `/images/notification-icon.png` / `-512.png`, theme `#000000`, background `#ffffff`.
- Service worker: `public/sw.js` Network-First; register via `PwaRegister.tsx`.
- Full-width date pickers; mobile calendar modal; `env(safe-area-inset-bottom)` on fixed UI.

## Module Status

| Module | Route | Status |
| --- | --- | --- |
| Command Center | `/[locale]` | Active |
| Inventory | `/[locale]/inventory` | Active — DnD + Stock RPC + count policy |
| Stock Count | `/[locale]/inventory/count` | Active |
| Inventory Accuracy | `/[locale]/inventory/accuracy` | Active — exact-count only + gauge |
| Branch Withdraw | `/[locale]/inventory/branch-withdraw` | Active — batch IN to branch 2 |
| Staff Dashboard | `/[locale]/dashboard` | Active |
| Schedule | `/[locale]/schedule` | Active — DnD |
| Maintenance | `/[locale]/maintenance` | Active |
| Sales | `/[locale]/sales` | Active |
| Settings | `/[locale]/settings` | Active |
| AI Assistant (บรู) | Global overlay | Active — Gemini + Tavily |
| PIN Auth | PinGateway | Active — full + read-only |
| Trusted-device Passkeys | Settings | Active |

## Global Rules

- Use `inventory_item_id` for transaction FKs.
- Never score `sufficiency_check` items in accuracy.
- Call `revalidateAppPaths` after cross-module mutations.
- Follow TDD SOP for new logic.
- AI: `isMounted` + `next/dynamic` `ssr: false`; use `maxOutputTokens` (never `maxTokens`).
- Zero-Bold: no `font-bold` / `font-semibold`.
- Never parse raw `localStorage` without type validation.
- Knowledge graph: **codebase-memory-mcp** only.

## Environment Variables

Authoritative list: [`.env.example`](../.env.example). Keys read in `src/`:

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | PUBLIC | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | PUBLIC | Anon key (RLS client) |
| `SUPABASE_SERVICE_ROLE_KEY` | SECRET | Server Actions, AI tools, cron |
| `APP_PIN` | SECRET | Full-access PIN |
| `APP_READ_ONLY_PIN` | SECRET | Read-only PIN; production required |
| `WEBAUTHN_RP_ID` | SECRET | OPTION — production WebAuthn RP ID |
| `WEBAUTHN_ORIGIN` | SECRET | OPTION — production WebAuthn origin |
| `NEXT_PUBLIC_STORE_LAT` / `NEXT_PUBLIC_STORE_LON` | PUBLIC | Store coordinates |
| `GOOGLE_GENERATIVE_AI_API_KEY` | SECRET | Gemini (`@ai-sdk/google`) |
| `TAVILY_API_KEY` | SECRET | `internetSearchTool` |
| `GOOGLE_CALENDAR_API_KEY` | SECRET | OPTION — holiday sync |
| `CRON_SECRET` | SECRET | Protects `GET /api/daily-report` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | PUBLIC | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | SECRET | Web Push server signing key |
| `VAPID_SUBJECT` | SECRET | Push service contact URI |
| `PUSH_WEBHOOK_SECRET` | SECRET | OPTION — `POST /api/push/webhook` auth |

Read-only PIN: `APP_READ_ONLY_PIN` (`src/lib/security/read-only-pin.ts`); dev fallback `111222`.
