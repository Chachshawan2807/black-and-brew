# SQL Files Index

## Source of truth

Official schema changes: **`supabase/migrations/`**

Apply migrations via `supabase db push` when CLI is linked, or run individual migration files in the Supabase Dashboard SQL Editor.

Verify remote state: `npm run db:verify`

## Directory roles

| Location | Purpose |
|----------|---------|
| `supabase/migrations/` | Versioned migrations (login_history, data_change_logs, revoked_sessions, push_subscriptions, inventory ADD/DELETE, count verifications) |
| `sql/` | Operational scripts and RPC reference blueprints |
| Root `*.sql` | Historical reference schemas (`DB_SCHEMA.sql`, `sales_schema.sql`, etc.) — applied historically |

## Reference blueprints (`sql/`)

| File | Purpose |
|------|---------|
| `record_inventory_transaction.sql` | Atomic IN/OUT RPC — used by Quick Entry and bulk quick actions |
| `sync_inventory_stock.sql` | `set_inventory_stock` RPC, order_qty trigger, REPLICA IDENTITY |
| `fix_inventory_rls.sql` | RLS hardening — authenticated-only |
| `ai_agent_views.sql` | AI gateway views/RPCs (`get_ai_store_status`) |
| `inventory_transactions_readable_view.sql` | Readable ledger view |

## Canonical migrations (`supabase/migrations/`)

| File | Purpose |
|------|---------|
| `20260611120000_create_login_history.sql` | Login audit trail + device fingerprinting |
| `20260612120000_create_data_change_logs.sql` | Data mutation audit log |
| `20260612130000_inventory_notifications.sql` | Realtime + RLS read for inventory `data_change_logs` |
| `20260612140000_inventory_add_delete_history.sql` | Transaction types ADD/DELETE; nullable `inventory_item_id` |
| `20260612200000_revoked_sessions.sql` | Remote session revocation by fingerprint |
| `20260614120000_inventory_count_verifications.sql` | Count accuracy ledger (initial table) |
| `20260615120000_inventory_count_accuracy_refactor.sql` | `system_stock_qty` column; clear legacy verification rows |
| `20260615130000_align_low_stock_with_purchase_orders.sql` | `view_inventory_summary` LOW/WARNING/OK aligned with purchase-order modal |
| `20260616120000_push_subscriptions.sql` | Web Push subscription storage + RLS (cross-device inventory alerts) |
