# Bean order shipped notification — Design

**Date:** 2026-07-26  
**Status:** Approved for implementation

## Problem

Staff need an in-app FAB badge and Notification panel entry when a bean order first becomes **shipped** (`fulfillment_status: pending → shipped`). Today only **delivered** (`tracking_status` → delivered, UI label 「จัดส่งสำเร็จ」) notifies.

## Goals

- Fire **once** when `shipBeanOrder` successfully transitions `pending → shipped`.
- Show unread badge on the notification FAB and an item in the Notification panel.
- Title: **「ส่งแล้ว」** (EN: `Shipped`).
- Keep TrackingMore register/sync, shipment updates, and existing **delivered** notifications unchanged.
- Updating tracking on an already-shipped order must **not** re-notify.

## Non-goals

- Persistent “all open shipped orders” badge unrelated to read state.
- Renaming delivered copy 「จัดส่งสำเร็จ」.
- Schema / RLS migrations.

## Approach

Mirror the existing `bean_order_delivered` pipeline with a new kind `bean_order_shipped`.

### Trigger

In `shipBeanOrder`, after order + shipment DB writes succeed, if `isNewShipment` (`fulfillment_status` was `pending`):

1. Call `notifyBeanOrderShipped(...)` (fire-and-forget; failures must not fail ship).
2. Existing TrackingMore create/fetch and `maybeNotifyBeanOrderDelivered` remain as today.

### Persistence

Insert into `data_change_logs`:

| Field | Value |
|-------|--------|
| module | `bean_orders` |
| entity_type | `bean_order_shipment` |
| entity_id | order id |
| entity_label | order_no |
| action | `UPDATE` |
| source | `system` or actor-appropriate |
| metadata.kind | `bean_order_shipped` |
| metadata.notificationLogId | `bb-bean-shipped-{orderId}` |
| metadata.title / summary / url / trackingNumber / orderNo / customerName | display fields |

Idempotent: if a success log with `metadata.kind === 'bean_order_shipped'` already exists for that `entity_id`, skip insert.

### Client

`useInventoryNotifications`:

- Treat `isEligibleBeanOrderShippedNotification` like delivered for filter / format / catch-up / realtime (`module: bean_orders`).
- Prefs: master `enabled` + action rules (same as other system bean notifications); web push uses `systemNotifications`.

### Web push + SW

- Payload `kind: 'bean_order_shipped'`.
- `public/sw.js` handles it like `bean_order_delivered` (panel forward + badge + showNotification).

### Display

- Icon surface may reuse bean-delivered pastel; recognize `metadata.kind === 'bean_order_shipped'` (and title 「ส่งแล้ว」).
- Click URL: `/{locale}/bean-orders/{orderId}`.
- Summary: customer display name + tracking number when present.

## Error handling

- Notify failures: `console.error` only; ship still returns success.
- Missing Supabase / missing `data_change_logs`: return soft failure, no throw to caller.
- Push VAPID missing: skip push, still record in-app log when possible.

## Testing

- Unit: transition once-only; eligibility/format; push payload title 「ส่งแล้ว」.
- Wiring smoke: hook + SW recognize `bean_order_shipped`.
- Regression: delivered helpers and TrackingMore path in `shipBeanOrder` unchanged in structure.

## Out of scope follow-ups

- Separate settings toggle for bean shipped vs delivered.
- Backfilling notifications for historical shipped orders.
