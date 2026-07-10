# BLACKANDBREW ERP Capability Inventory

> Last Updated: 2026-07-10
>
> Companion: agent rules → [`AGENTS.md`](../AGENTS.md) · hard protocols → [`docs/rules.md`](rules.md)

## Current Capabilities

### Data and Integration

- AI Data Gateway: `src/lib/ai-data-gateway.ts` is the single AI read doorway (presets, limits, service-role, schedule lookup, `get_ai_store_status`, `fetchSalesSummary`, `fetchInventoryLedger`).
- Universal DB Reader: `readTableTool` routes through the gateway.
- Deterministic paths: daily schedule, upcoming maintenance, low-stock PO summary, sales summary, upcoming holidays, store status short-circuit to SSE (no LLM).
- External Intel: `internetSearchTool` + `tavily-client.ts` (Tavily; structured `{ ok:false, reason }` on error).
- Inventory Truth Layer: `inventory-stock.ts`, `mergeInventoryRealtimeUpdate`, `computeItemsToOrder`, `updateInventoryStock`, RPC `set_inventory_stock`.
- Supabase Session Bridge: `ensureSupabaseSession()` after PIN → anonymous `authenticated` RLS.
- Web Push: `push-actions.ts`, `web-push.ts`, `push_subscriptions`, `PushSubscriptionManager` (inventory alerts + daily reports).
- Trusted-device Passkeys: `passkey-actions.ts`, `src/lib/passkey/`, `settings/_components/PasskeyDeviceSection.tsx`, `device_passkeys`.

### UI and Client Runtime

- Hydration-safe: `isMounted` on `AIChatOverlay`, `PinGateway`, clickable date inputs.
- Optimistic UI for inventory/count; DnD via `useSafeDndSensors`.
- Motion: `motion-presets.ts`, `PageTransition`, `.bb-modal-*`, `.bb-transition`.
- Theme: `next-themes` + CSS tokens + `bb-pastel-surface` for pastel cards.

### Security and Integrity

- PIN auth + `assertWritableSession`; session audit via `login_history` / `revoked_sessions`.
- Passkey: server-side challenges, RP verify, counter updates, revocation checks.
- Prompt/XSS sanitizers on chat; rate limits (chat 30/hr, Tavily 10/hr).
- `data_change_logs` for mutation diffs + inventory notifications.

## Active AI Tool Surface

| Tool | Source | Scope |
| --- | --- | --- |
| `getDailyShifts` | `src/app/actions/tools/database-tools.ts` | Daily roster (names + groups) |
| `getStoreStatus` | `src/app/actions/tools/database-tools.ts` | One-shot today shifts + inventory via `get_ai_store_status` |
| `getSalesSummary` | `src/app/actions/tools/database-tools.ts` | Aggregated sales by date range |
| `getInventoryLedger` | `src/app/actions/tools/database-tools.ts` | Transactions joined with item names |
| `getInventoryItemDetails` | `src/app/actions/tools/database-tools.ts` | Single SKU via `get_ai_inventory_item_details` |
| `readTable` | `src/app/actions/tools/database-tools.ts` | Preset-locked table reads via gateway |
| `internetSearchTool` | `src/app/actions/tools/search-tools.ts` | Tavily web search (`{ ok, results }` envelope) |

## Schema Guardrails

- `inventory_items` preset: `id, name, unit, source, order_point, target_stock, stock, order_qty, updated_at`.
- `shifts`: use `metadata.location` / `shift_type` — not `start_time` as the shift label.
- `profiles`: `schedule_order`, `dashboard_order`, `display_order`.
- `device_passkeys`: service-role credential storage by `credential_id` + `session_fingerprint`.

## Domain skill modules (when to apply)

Use with `AGENTS.md` + `docs/rules.md`.

### Mobile UX

| Skill | When | How |
| --- | --- | --- |
| Single-row compact layout | Mobile / tight screens | `flex-row` or fixed one-row grid |
| Segmented controls | Paired toggles (IN/OUT) | Rounded container; active = filled |
| Resizable tables | Maintenance column widths | SSR default → `localStorage` → mouse resize |
| Sticky modal tables | Long tables in modals | `sticky top-0` header; `max-h` + overflow body |

### Hybrid AI context

| Skill | When | How |
| --- | --- | --- |
| Live screen extraction | AI needs open-modal context | Structured `{ pathname, openModalHint, screenText }` → `clientContext` (wired into system prompt) |
| DnD coordinate tracking | Schedule / inventory drag | Sensors + spring physics; DOM separation |
| Context bootstrapping | New agent session | codebase-memory-mcp (`search_graph`, `trace_path`) |

### Security & inventory integrity

| Skill | When | How |
| --- | --- | --- |
| Prompt / input sanitization | User text → AI or DB | Sanitize; block injection |
| Zod validation | API / Server Action inputs | Schema-enforce types |
| Service-role writes | Cross-RLS mutations | Server Actions only; auth first |
| Zero-cache stock/ledger | Stock + transaction truth | `unstable_noStore()`; row locks |
| PIN / session isolation | Auth gate | httpOnly cookies + `sessionStorage`; lockout in `localStorage` |
| Stock single source of truth | Warehouse / count edits | `set_inventory_stock` + `mergeInventoryRealtimeUpdate()` |
| Count policy | Accuracy + PO qty | `exact_count` scores; `sufficiency_check` manual `order_qty` |
| Motion | Modals / routes / toasts | `motion-presets.ts` + `.bb-modal-*`; opacity/transform only |

### Performance & AI token economy

| Skill | When | How |
| --- | --- | --- |
| Thai token optimizer | Thai text into AI context | `thaiTokenOptimizer` |
| Restricted selects | Supabase reads | Explicit columns — never `select('*')` on hot paths |
| Numeric sanitization | Forms → DB | Empty → `0`; strip leading zeros |
| Sliding chat memory | `/api/chat` | `MAX_MEMORY_MESSAGES = 8`, char cap 2000; multi-turn intent (last 3 user msgs) |
| Output token cap | Gemini calls | `maxOutputTokens: 1600`; `maxSteps` up to 7 for multi-domain |
| Dashboard query plan | Week + month overlap | `getDashboardShiftQueryPlan()` + `splitDashboardShiftsByRange()` |
| Inventory bundle split | Heavy modals/charts | `next/dynamic` + intent preload |
| Row containment | Dense inventory grid | `.bb-inventory-row-containment` |
