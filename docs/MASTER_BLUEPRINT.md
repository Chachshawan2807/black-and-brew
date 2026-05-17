# Black-and-Brew ERP: MASTER BLUEPRINT [R0]

## 🏛️ Architectural Core

The system is built on **Next.js 16.2.4** (Turbopack) and **Supabase**, prioritizing extreme visual consistency, high-fidelity interactions, and robust data persistence.

### 1. Visual Standard: "Pastel Frictionless"

- **Color Palette**: Minimalist Pastel (`#fdfcf0` background, soft greens/blues/reds for status).
- **Typography**: **ZERO-BOLD POLICY**. All text must use `font-normal`. Emphasis is achieved via color intensity or layout, never via font weight.
- **Navigation Chips**: Category selection is rendered as lightweight, border-rounded **Pill-shaped Navigation Chips** (`rounded-full px-4 py-2 border font-normal`) featuring decoupled count badges inside `<span>` tags. Active states utilize solid soft black `#000000` with muted white counts, while inactive states utilize transparent backgrounds with delicate grey borders and charcoal text.
- **Interactions**: Snappy, spring-based animations (Framer Motion).
- **Legibility**: Pure black (`#000000`) text on pastel backgrounds for maximum contrast.

### 2. Interaction Engine: "Precision DnD"

- **Library**: `dnd-kit`.
- **Sensors**: `PointerSensor` (distance: 5px), `KeyboardSensor`.
- **Collision**: `closestCorners`.
- **Feedback**:
  - Row Drag: `scale: 1.02`, `opacity: 0.8`.
  - Card Drag: `scale: 1.05`, `opacity: 0.7`.
  - Z-Index: `100` for active items.
- **Physics**: Framer Motion `layout` prop with `stiffness: 300`, `damping: 30`.

### 3. Data Integrity: "Service Role Protocol"

- **Persistence**: All critical database mutations (reordering, stock updates) must bypass RLS using the **Supabase Service Role Key** via Server Actions.
- **Atomic Updates**: Use `Promise.all` for batch updates (e.g., reordering entire lists) followed by `revalidatePath`.
- **Zero-Stock Logic**: Numeric inputs must treat empty strings as `0` and explicitly persist `0` to the database.

### 4. AI Agent: "บรู" (Vercel AI SDK v6)

- **Model**: `gemini-2.0-flash` via `@ai-sdk/google`.
- **Transport**: `DefaultChatTransport` (useChat hook) → `POST /api/chat`.
- **Token Optimization**: Sliding window (`messages.slice(-4)`), `maxOutputTokens: 600`, ultra-minimalist system prompt.
- **Tools**: Surgical partitioning — `getTodaySchedule`, `getLowStockItems`, `searchInventory`, `getInventoryItemDetails`, `recordTransaction`.
- **Security**: AI reads via Supabase Security Definer RPCs (`get_ai_store_status`, `get_ai_inventory_item_details`) — read-only data layer.
- **Hydration**: `AIChatOverlay` uses `isMounted` guard (`useEffect(() => setIsMounted(true), []`) to prevent Math.random prerender errors. Loaded via `next/dynamic ssr:false` in `AIChatWrapper`.
- **Branding & UI Polish**: Implemented a custom branding logo loaded dynamically via `/ai-agent-logo.svg` inside standard Next.js `<Image />` tags, overriding the generic Lucide `<Bot />` icons in the header, bubble avatars, and thinking indicators for maximum brand coherence.
- **UI Enhancements (R0 Standard)**:
  - Swapped the generic closed-state floating button icon (`MessageCircle`) with the branding logo (inverted to pure white).
  - Scaled up the chat bubble text size to `text-[15px]` using `font-light antialiased` typography parameters for a crisp, ultra-legible screen display while strictly respecting the **Zero-Bold Policy** (zero bold styling).
  - Enhanced contrast hierarchy by changing secondary sub-headers and loaders from generic transparent black (`text-[#000000]/40`) to a high-density "Deep Coffee" shade (`text-[#1a1a1a]`).
  - Added a click-outside backdrop overlay (`fixed inset-0 z-[198] bg-black/0`) within the `<AnimatePresence>` wrapper to seamlessly close the chat window when empty space is clicked.

### 5. Persistent UI & Session States

- **Dashboard Date Range Persistence**: User-selected start/end dates for the dashboard live shift list are persisted in browser cookies (`dashboard_start_date` and `dashboard_end_date`) for 1 year (Max-Age `31536000`, `SameSite=Lax`).
- **Data Resolution Chain**: Dates are resolved hierarchically: URL parameters take precedence, followed by saved cookies, and finally defaulting to the current week's Monday-to-Sunday range. This allows server-side queries to render persistent dates without client-side hydration layout shifts.

### 6. Schedule Grid & Summary Computations

- **Strict Shift Filtering & Deduplication Logic**:
  - Daily summary rows strictly count only employees having shifts matching `6:30`, `7:00`, or `8:00`.
  - Inactive or deleted employees loaded via database history are strictly filtered out by cross-referencing `orderedProfileIds` to prevent total count bloating.
  - Set-based deduplication (`new Set(...).size`) is integrated to ensure each active employee is counted at most once per day, matching absolute scheduling realities.
  - Non-work shifts like `ร้านซักผ้า` or `ไปสาขา 2` are visually retained in cells for operational scheduling, but are completely filtered out from summary row calculations.
  - Sinks directly into `ScheduleClient.tsx` grid sum calculations to maintain absolute scheduling accuracy and data parity.
- **High-Fidelity PNG Export**:
  - A client-side "บันทึกรูปภาพ" action integrates the `html-to-image` library loaded via dynamic browser-only imports to prevent Next.js SSR build errors.
  - Scales the capture by `2` (pixelRatio: 2) to ensure high-definition text output for print or share.
  - Targets the inner `min-w-[900px] h-fit` grid wrapper `id="blackandbrew-schedule-table"` to crop exactly to the content dimensions, completely eliminating extra white space at the bottom of the exported image.
  - Aligns Holiday row and Day headers inside the scrolling container so they scroll and export uniformly as a single calendar block.
  - Resets styles (margin/padding: 0, border: none, boxShadow: none) during render for a clean tight crop.

## 📂 Module Status

| Module | DnD Status | Persistence | UI Mirroring |
| :--- | :--- | :--- | :--- |
| **Inventory** | SOURCE (Gold) | Service Role | 100% |
| **Staff Dashboard** | MIRRORED | Service Role | 100% |
| **Schedule** | MIRRORED | Service Role | 100% |
| **AI Assistant (Bru)** | STABLE | AI SDK v6 | 100% |

## 🛠️ Global Rules

- **Naming**: Strictly use `inventory_item_id` for transaction foreign keys.
- **Revalidation**: Call `revalidateAppPaths` after any cross-module mutation.
- **Testing**: Follow TDD SOP for all new logic.
- **AI Hydration**: `AIChatOverlay` must include `isMounted` guard + be loaded via `next/dynamic` with `ssr: false`.
- **AI SDK**: Always use `providerOptions.google.generationConfig.maxOutputTokens`. Never use `maxTokens`.
- **Zero-Bold**: No `font-bold` or `font-semibold` anywhere. Verified via grep scan on every closing.

---

Last Updated: 2026-05-17 [v3.15 DAILY CLOSING]

