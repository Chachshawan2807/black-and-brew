# Bean Orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff-facing coffee bean order module at `/[locale]/bean-orders` with customers, multi-line orders, slip payment, shipping, TrackingMore, and full audit.

**Architecture:** Single feature module colocated under `app/[locale]/bean-orders/` with domain logic in `lib/bean-orders/`, mutations in `bean-order-actions.ts`, Supabase tables prefixed `bean_*`, dual-axis status (`payment_status` × `fulfillment_status`), no inventory stock deduction.

**Tech Stack:** Next.js App Router, Supabase (Postgres + Storage), Server Actions, Vitest, TrackingMore API v4, `data_change_logs`

## Global Constraints

- Staff-only (no public checkout); read-only PIN users can view only
- Sell units: gram/kg; inventory_items reference only — no auto stock deduction
- Manual price/kg, shipping, discount (baht) per order
- Payment: upload slip image → staff confirm; no bank API
- Tracking number optional (same_day / Lalamove); TrackingMore when number present
- Theme: `bg-background`, `bg-card`; pastel badges with `bb-pastel-surface`
- Order number format: `BO-YYYYMMDD-XXX`
- TDD: failing test before production code; auth via `gateMutation()` / `requireReadAccess()`

---

## File map

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260722140000_bean_orders.sql` | Tables, RLS, storage bucket policy |
| `src/lib/bean-orders/types.ts` | Shared TS types |
| `src/lib/bean-orders/pricing.ts` | Weight conversion + totals |
| `src/lib/bean-orders/order-status.ts` | Status labels, transitions, history append |
| `src/lib/bean-orders/order-number.ts` | `BO-YYYYMMDD-XXX` generator |
| `src/lib/bean-orders/defaults.ts` | Default shop sender snapshot |
| `src/lib/bean-orders/trackingmore.ts` | TrackingMore HTTP client |
| `src/app/actions/bean-order-actions.ts` | All server mutations/queries |
| `src/app/api/bean-orders/tracking-webhook/route.ts` | Webhook handler |
| `src/app/api/bean-orders/sync-tracking/route.ts` | Manual/cron sync |
| `src/app/[locale]/bean-orders/*` | Pages + client components |
| `src/lib/menu-list.ts` | Sidebar entry |
| `src/lib/data-change-log.ts` | Add `bean_orders` module |

---

### Task 1: Domain logic (pricing + status)

**Files:**
- Create: `src/lib/bean-orders/pricing.ts`, `order-status.ts`, `types.ts`
- Test: `src/test/bean-orders-pricing.test.ts`, `bean-orders-order-status.test.ts`

**Interfaces:**
- Produces: `weightToKg()`, `computeLineTotal()`, `computeOrderTotals()`, `getOrderStatusLabel()`, `canTransition()`, `appendStatusHistory()`

- [ ] Write failing tests for pricing (500g × 400฿/kg = 200฿) and status labels
- [ ] Implement `pricing.ts` and `order-status.ts`
- [ ] Run `npm test -- src/test/bean-orders-pricing.test.ts src/test/bean-orders-order-status.test.ts`
- [ ] Commit: `feat(bean-orders): add pricing and status domain logic`

---

### Task 2: Database migration

**Files:**
- Create: `supabase/migrations/20260722140000_bean_orders.sql`

Tables: `bean_customers`, `bean_customer_addresses`, `bean_orders`, `bean_order_lines`, `bean_order_payments`, `bean_order_shipments`

RLS: authenticated SELECT all; INSERT/UPDATE/DELETE via service role in server actions (match branch_withdrawals pattern)

Storage bucket `bean-order-slips` with authenticated upload policy

- [ ] Apply migration locally or via Supabase MCP
- [ ] Regenerate `database.types.ts` if project uses codegen
- [ ] Commit: `feat(bean-orders): add database schema migration`

---

### Task 3: Audit module extension

**Files:**
- Modify: `src/lib/data-change-log.ts`, `src/app/actions/data-change-log-actions.ts`

- [ ] Add `'bean_orders'` to `DataChangeModule` enum + zod schema
- [ ] Commit: `feat(bean-orders): register bean_orders audit module`

---

### Task 4: Server actions — customers & orders CRUD

**Files:**
- Create: `src/app/actions/bean-order-actions.ts`
- Test: `src/test/bean-orders-actions.test.ts` (pure helpers + zod schemas)

Actions: `searchBeanCustomers`, `createBeanCustomer`, `createBeanOrder`, `updateBeanOrder`, `fetchBeanOrders`, `fetchBeanOrderDetail`, `cancelBeanOrder`

- [ ] Tests for order number format + zod validation
- [ ] Implement actions with `gateMutation()` / `requireReadAccess()`
- [ ] `recordDataChange` on every mutation
- [ ] Commit: `feat(bean-orders): add customer and order server actions`

---

### Task 5: Payment slip upload & confirm

**Files:**
- Modify: `src/app/actions/bean-order-actions.ts`
- Test: `src/test/bean-orders-payment.test.ts`

Actions: `uploadBeanOrderSlip`, `confirmBeanOrderPayment`

- [ ] Upload to `bean-order-slips/{orderId}/{ts}.jpg`
- [ ] Confirm sets `payment_status = paid`, appends history
- [ ] Commit: `feat(bean-orders): add slip upload and payment confirm`

---

### Task 6: Shipment + TrackingMore

**Files:**
- Create: `src/lib/bean-orders/trackingmore.ts`
- Create: `src/app/api/bean-orders/tracking-webhook/route.ts`, `sync-tracking/route.ts`
- Modify: `src/app/actions/bean-order-actions.ts`
- Test: `src/test/bean-orders-trackingmore.test.ts`

Action: `shipBeanOrder` — sets `fulfillment_status = shipped`, optional TrackingMore create

- [ ] `TRACKINGMORE_API_KEY` env documented in `.env.example`
- [ ] Webhook updates `tracking_status`
- [ ] Commit: `feat(bean-orders): add shipment and TrackingMore integration`

---

### Task 7: Order list page

**Files:**
- Create: `src/app/[locale]/bean-orders/page.tsx`, `BeanOrdersClient.tsx`, `_components/OrderStatusBadge.tsx`
- Modify: `src/lib/menu-list.ts`, `src/lib/route-chunk-preload.ts`
- Test: `src/test/bean-orders-menu.test.ts`

- [ ] List with filters (payment, fulfillment, search, date)
- [ ] Sidebar menu item with icon `Coffee` or `Package2`
- [ ] Commit: `feat(bean-orders): add order list page and sidebar menu`

---

### Task 8: Create/edit order form

**Files:**
- Create: `new/page.tsx`, `BeanOrderFormClient.tsx`, `_components/OrderLineEditor.tsx`, `CustomerPicker.tsx`, `AddressFields.tsx`

- [ ] Customer search/create, address picker, sender defaults, line items, totals
- [ ] Read-only guard on submit
- [ ] Commit: `feat(bean-orders): add create order form`

---

### Task 9: Order detail page

**Files:**
- Create: `[id]/page.tsx`, `BeanOrderDetailClient.tsx`, `_components/PaymentSlipSection.tsx`, `ShipmentSection.tsx`, `OrderTimeline.tsx`

- [ ] Payment, ship, tracking display, timeline, cancel
- [ ] Commit: `feat(bean-orders): add order detail page with actions`

---

### Task 10: Docs & smoke

**Files:**
- Modify: `docs/database.md` (table list)

- [ ] Run full test suite for bean-orders tests
- [ ] Manual smoke: create order → confirm payment → ship with tracking
- [ ] Commit: `docs: document bean orders tables`
