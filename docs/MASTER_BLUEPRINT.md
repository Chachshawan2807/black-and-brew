# Black-and-Brew ERP: MASTER BLUEPRINT [R0]

## 🏛️ Architectural Core

The system is built on **Next.js 16.2.4** (Turbopack) and **Supabase**, prioritizing extreme visual consistency, high-fidelity interactions, and robust data persistence.

### 1. Visual Standard: "Pastel Frictionless"

- **Color Palette**: Minimalist Pastel (`#fdfcf0` background, soft greens/blues/reds for status).
- **Typography**: **ZERO-BOLD POLICY**. All text must use `font-normal`. Emphasis is achieved via color intensity or layout, never via font weight.
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
Last Updated: 2026-05-17 [v3.4 DAILY CLOSING]
