# Bean Order Shipped Notification Implementation Plan

> **For agentic workers:** Implement task-by-task with TDD. Steps use checkbox syntax.

**Goal:** Notify FAB + Notification panel once when a bean order transitions `pending → shipped`, without breaking TrackingMore or delivered notifications.

**Architecture:** Mirror `bean_order_delivered` with new `bean_order_shipped` helpers, fire from `shipBeanOrder` only on `isNewShipment`, hydrate via existing `data_change_logs` realtime in `useInventoryNotifications`.

**Tech Stack:** Next.js Server Actions, Supabase `data_change_logs`, Vitest, existing web-push / SW bridge.

## Global Constraints

- Title TH: `ส่งแล้ว` · EN: `Shipped`
- Kind: `bean_order_shipped` · log id: `bb-bean-shipped-{orderId}`
- Do not change TrackingMore create/fetch or delivered notify paths beyond additive call
- No schema migrations

---

## Task 1: Shipment notification helpers + tests

**Files:**
- Create `src/lib/bean-orders/shipment-notification.ts`
- Create `src/test/bean-orders-shipment-notification.test.ts`

- [x] Write failing tests for `shouldNotifyBeanOrderShipped`, log id, eligibility, format title/summary
- [x] Implement helpers mirroring `delivery-notification.ts` (entity_type `bean_order_shipment`)
- [x] Run tests green

## Task 2: Web push helpers + tests

**Files:**
- Create `src/lib/bean-orders/shipment-web-push.ts`
- Create `src/test/bean-orders-shipment-web-push.test.ts`

- [x] Failing tests for payload kind/title/url and prefs gate
- [x] Implement `notifyBeanOrderShipped` (record + push, idempotent)
- [x] Run tests green

## Task 3: Wire `shipBeanOrder`

**Files:**
- Modify `src/app/actions/bean-order-actions.ts`

- [x] After successful DB write, if `isNewShipment`, fire-and-forget `notifyBeanOrderShipped` with order lookup for customer name
- [x] Ensure TrackingMore + `maybeNotifyBeanOrderDelivered` blocks remain untouched in order

## Task 4: Hook + icon + SW

**Files:**
- Modify `src/hooks/use-inventory-notifications.ts`
- Modify `src/lib/notification-display-icon.ts`
- Modify `public/sw.js`
- Update `src/test/notification-fab-sync.test.ts`, `src/test/notification-display-icon.test.ts` as needed

- [x] Filter/format/catch-up/realtime for shipped
- [x] Icon + SW kind handling
- [x] Wiring tests green

## Task 5: Verify

- [x] Run targeted vitest suite for bean shipment + fab sync + display icon
- [x] Confirm delivered tests still pass
