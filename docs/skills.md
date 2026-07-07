# BLACKANDBREW ERP Capability Inventory

> Last Scanned & Updated: 2026-07-08 (Documentation Sync v9.1)

## Current Capabilities

### Data and Integration

- AI Data Gateway: `src/lib/ai-data-gateway.ts` is the single AI read doorway. It owns table presets, aliases, limits, service-role access, schedule lookup, and inventory snapshots through `get_ai_store_status`.
- Universal DB Reader: `readTableTool` routes through the gateway instead of owning a Supabase client.
- Deterministic Daily Schedule: daily schedule questions short-circuit through `detect-schedule-query`, `fetchDailyShiftsByDate`, `formatScheduleChatResponse`, and deterministic SSE.
- External Intel: `internetSearchTool`, `tavily-client.ts`, `/api/weather`, and OpenWeatherMap support AI chat and weather-aware reports.
- Inventory Truth Layer: `inventory-stock.ts`, `mergeInventoryRealtimeUpdate`, `computeItemsToOrder`, `updateInventoryStock`, and RPC `set_inventory_stock` keep warehouse and count pages aligned.
- Supabase Session Bridge: `ensureSupabaseSession()` signs in anonymously after the PIN gate so client RLS runs as `authenticated`.
- Web Push: `push-actions.ts`, `web-push.ts`, `push_subscriptions`, and `PushSubscriptionManager` support cross-device inventory alerts.
- Trusted-device Passkeys: `passkey-actions.ts`, `src/lib/passkey/`, `settings/_components/PasskeyDeviceSection.tsx`, `device_passkeys`.

### UI and Client Runtime

- Hydration-safe client state: `isMounted` guards protect `AIChatOverlay`, `PinGateway`, and clickable date inputs.
- Client cache utilities: `client-cache.ts` provides TTL cache helpers for browser-side data.
- Optimistic UI: inventory and count workflows update local state immediately, then sync through Supabase.
- DnD: `useSafeDndSensors` configures mouse, touch, and keyboard sensors for schedule and inventory interactions.
- Motion: `motion-presets.ts`, `PageTransition`, `.bb-modal-*`, `.bb-transition`, `FloatingAlert`, and `FloatingToast` provide consistent animation.
- Full-width clickable inputs: `ClickableDatePicker` keeps touch hitboxes accessible.
- Theme: `next-themes`, CSS tokens, and `bb-pastel-surface` preserve dual-theme contrast while keeping pastel shift cards black-on-pastel.

### Security and Integrity

- PIN auth: `auth.ts`, httpOnly cookies, read-only mode, `assertWritableSession`, and `AuthProvider` guard write access.
- Session audit: `login_history`, `revoked_sessions`, Settings session controls, and device fingerprinting provide accountless device control.
- Passkey security: WebAuthn challenges are stored server-side, RP ID/origin are verified, counters are updated, and revoked fingerprints block passkey login.
- Prompt and XSS safety: `sanitizePromptInput`, `sanitizeXssPayload`, `sanitizeScreenContext`, `cleanToolOutput`, and chat auth gates reduce injection and stored-content risk.
- Rate limits: chat uses 30 requests/hour and Tavily uses 10 requests/hour with cache-before-rate-limit behavior.
- Data change history: `data_change_logs` records mutation diffs and drives inventory notifications.

## Active AI Tool Surface

| Tool | Source | Scope |
| --- | --- | --- |
| `getDailyShifts` | `src/app/api/chat/route.ts` | Daily roster fallback when deterministic detection is not enough |
| `readTable` | `src/app/actions/tools/database-tools.ts` | Preset-locked internal table reads through `ai-data-gateway.ts` |
| `internetSearchTool` | `src/app/actions/tools/search-tools.ts` | External search/weather-style context through Tavily |

Internal-only daily report tools live in `internal-sources-tools.ts` and are not exposed through chat.

## Schema Guardrails

- `inventory_items`: preset `id, name, unit, source, order_point, target_stock, stock, order_qty, updated_at`.
- `service_records`: preset uses equipment, dates, status, cost, work details, and responsible person.
- `shifts`: schedule logic reads `metadata.location` / `shift_type`; `start_time` is not the shift label.
- `profiles`: ordering fields are `schedule_order`, `dashboard_order`, and `display_order`.
- `device_passkeys`: service-role-only WebAuthn credential storage keyed by `credential_id` and `session_fingerprint`.
- AI chat active tools are `getDailyShifts`, `readTable`, and `internetSearchTool`.
