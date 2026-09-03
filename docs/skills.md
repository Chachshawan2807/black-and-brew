# BLACKANDBREW ERP Capability Inventory

> Last Updated: 2026-09-03
>
> Companion: agent rules → [`AGENTS.md`](../AGENTS.md) · hard protocols → [`docs/rules.md`](rules.md)

## Current Capabilities

### Data and Integration

- **Proactive cross-module insights:** `src/lib/proactive-insights/` + `GET /api/insight-alerts` deterministic rules correlating schedule/inventory/maintenance/bean-orders/accuracy; Web Push + NotificationBell; prefs `proactiveInsights`.
- Inventory Truth Layer: `inventory-stock.ts`, `mergeInventoryRealtimeUpdate`, `computeItemsToOrder`, `updateInventoryStock`, RPC `set_inventory_stock`.
- Supabase Session Bridge: `ensureSupabaseSession()` after PIN → anonymous `authenticated` RLS.
- Web Push: `push-actions.ts`, `web-push.ts`, `push_subscriptions`, `PushSubscriptionManager` (inventory alerts + daily reports + proactive insights).
- Trusted-device Passkeys: `passkey-actions.ts`, `src/lib/passkey/`, `settings/_components/PasskeyDeviceSection.tsx`, `device_passkeys`.
- Bean orders: `bean-order-actions.ts` optional Gemini parse for customer share text (`@ai-sdk/google`).

### UI and Client Runtime

- Hydration-safe: `isMounted` on `PinGateway`, clickable date inputs; `DeferredOverlays` defers notification FAB + quick action via `next/dynamic` (`ssr: false`).
- Optimistic UI for inventory/count; DnD via `useSafeDndSensors`.
- Motion: `motion-presets.ts`, `PageTransition`, `.bb-modal-*`, `.bb-transition`.
- Theme: `next-themes` + CSS tokens + `bb-pastel-surface` for pastel cards.

### Security and Integrity

- PIN auth + `assertWritableSession`; session audit via `login_history` / `revoked_sessions`.
- Passkey: server-side challenges, RP verify, counter updates, revocation checks.
- Prompt/XSS sanitizers for user text; PIN rate limits via Upstash Redis when configured.
- Edge protection: `config/vercel-firewall.json` + `npm run security:firewall:apply` (see `docs/security/waf-and-ddos.md`).
- RLS audit: `docs/security/rls-audit.md` migration `20260724170556_harden_rls_and_rpc_execute.sql`.
- `data_change_logs` for mutation diffs + inventory notifications.

### Retired (2026-09)

- `POST /api/chat`, `src/lib/agents/`, `src/lib/ai-data-gateway.ts`, `src/app/actions/tools/`, Tavily search, and `@ai-sdk/react` chat UI transport.

## Schema Guardrails

- `inventory_items` preset: `id, name, unit, source, order_point, target_stock, stock, order_qty, updated_at`.
- `shifts`: use `metadata.location` / `shift_type` not `start_time` as the shift label.
- `profiles`: `schedule_order`, `dashboard_order`, `display_order`.
- `bean_orders`: `order_no`, statuses, totals no slip URLs / tracking_raw in presets.
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

### Security & inventory integrity

| Skill | When | How |
| --- | --- | --- |
| Prompt / input sanitization | User text → DB | Sanitize; block injection |
| Zod validation | API / Server Action inputs | Schema-enforce types |
| Service-role writes | Cross-RLS mutations | Server Actions only; auth first |
| Zero-cache stock/ledger | Stock + transaction truth | `unstable_noStore()`; row locks |
| PIN / session isolation | Auth gate | httpOnly cookies + `sessionStorage`; lockout in `localStorage` |
| Stock single source of truth | Warehouse / count edits | `set_inventory_stock` + `mergeInventoryRealtimeUpdate()` |
| Count policy | Accuracy + PO qty | `exact_count` scores; `sufficiency_check` manual `order_qty` |
| Motion | Modals / routes / toasts | `motion-presets.ts` + `.bb-modal-*`; opacity/transform only |

### Performance

| Skill | When | How |
| --- | --- | --- |
| Restricted selects | Supabase reads | Explicit columns never `select('*')` on hot paths |
| Numeric sanitization | Forms → DB | Empty → `0`; strip leading zeros |
| Dashboard query plan | Week + month overlap | `getDashboardShiftQueryPlan()` + `splitDashboardShiftsByRange()` |
| Inventory bundle split | Heavy modals/charts | `next/dynamic` + intent preload |
| Row containment | Dense inventory grid | `.bb-inventory-row-containment` |

### Design anti-slop (Hallmark supplementary)

| Skill | When | How |
| --- | --- | --- |
| Hallmark audit | UI ดู generic / AI-generated | `hallmark audit <file>` punch list only; read `.cursor/skills/hallmark-erp/SKILL.md` first |
| Hallmark study | อยากดึง DNA จาก reference | `hallmark study <URL\|screenshot>` diagnosis only; ไม่ rebuild ERP core |
| ERP UI improvements | ปรับหน้า inventory/schedule/dashboard | ใช้ `web-design-guidelines` + `impeccable critique` **ไม่ใช้** Hallmark default/redesign |

Off-limits for Hallmark build/redesign: `inventory/`, `schedule/`, `dashboard/`, `settings/`, spreadsheet grids, pastel shift cards. Update upstream: `npx skills add nutlope/hallmark -y`.
