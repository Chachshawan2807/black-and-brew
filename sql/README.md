# SQL Files Index

## Source of truth

Official schema changes: `supabase/migrations/`

Apply migrations via `supabase db push` when CLI is linked, or run individual migration files in the Supabase Dashboard SQL Editor.

Verify remote state: `npm run db:verify`

Supabase Auth: Enable Anonymous Sign-ins in Dashboard → Authentication → Providers (required for `ensureSupabaseSession()` after PIN gate). Local CLI default: `enable_anonymous_sign_ins = true` in `supabase/config.toml`.

## Directory roles

| Location | Purpose |
| --- | --- |
| `supabase/migrations/` | Versioned migrations (login_history, data_change_logs, revoked_sessions, push_subscriptions, daily-report push fields, device_passkeys, inventory ADD/DELETE, count verifications, count policy, retired feature cleanup) |
| `sql/` | Operational scripts and RPC reference blueprints |
| Root `*.sql` | Historical reference schemas (`DB_SCHEMA.sql`, `sales_schema.sql`, etc.) — applied historically |

## Reference blueprints (`sql/`)

| File | Purpose |
| --- | --- |
| `record_inventory_transaction.sql` | Atomic IN/OUT RPC — used by Quick Entry and bulk quick actions |
| `sync_inventory_stock.sql` | `set_inventory_stock` RPC, order_qty trigger, REPLICA IDENTITY |
| `fix_inventory_rls.sql` | RLS hardening — authenticated-only |
| `ai_agent_views.sql` | AI gateway neutral views/RPCs (`view_today_shifts`, `view_inventory_summary`, `get_ai_store_status`) |
| `inventory_transactions_readable_view.sql` | Readable ledger view |

## Canonical migrations (`supabase/migrations/`)

| File | Purpose |
| --- | --- |
| `20260611120000_create_login_history.sql` | Login audit trail + device fingerprinting |
| `20260612120000_create_data_change_logs.sql` | Data mutation audit log |
| `20260612130000_inventory_notifications.sql` | Realtime + RLS read for inventory `data_change_logs` |
| `20260612140000_inventory_add_delete_history.sql` | Transaction types ADD/DELETE; nullable `inventory_item_id` |
| `20260612200000_revoked_sessions.sql` | Remote session revocation by fingerprint |
| `20260614120000_inventory_count_verifications.sql` | Count accuracy ledger (initial table) |
| `20260615120000_inventory_count_accuracy_refactor.sql` | `system_stock_qty` column; clear legacy verification rows |
| `20260615130000_align_low_stock_with_purchase_orders.sql` | `view_inventory_summary` LOW/WARNING/OK aligned with purchase-order modal |
| `20260616120000_push_subscriptions.sql` | Web Push subscription storage + RLS (cross-device inventory alerts) |
| `20260617120000_device_passkeys.sql` | WebAuthn trusted-device credentials for biometric login |
| `20260618163100_inventory_count_policy.sql` | `inventory_items.count_policy`; exact count vs sufficiency check |
| `20260620221500_reset_accuracy_history.sql` | Reset count accuracy history after policy recalculation rules changed |
| `20260621120000_push_subscriptions_daily_report.sql` | Extend `push_subscriptions` with `profile_id` and `branch_id` for daily schedule Web Push broadcasts |
| `20260622143800_drop_market_insights_tables.sql` | Drop optional retired feature tables |
| `20260622144706_drop_retired_ai_inventory_views.sql` | Drop retired AI-prefixed inventory helper views |
| `20260622162719_inventory_recommended_target_stock.sql` | Added then superseded — feature removed |
| `20260708095637_reset_accuracy_history.sql` | Reset count accuracy ledger after workflow changes |
| `20260708104230_remove_inventory_recommended_target_stock.sql` | Remove inventory recommended target stock (retired) |

## Cleanup audit

2026-07-08 cleanup: Inventory recommended target stock was removed. `20260708104230_remove_inventory_recommended_target_stock.sql` drops related schema after `20260622162719_*` was superseded. `20260708095637_reset_accuracy_history.sql` clears the count accuracy ledger.

2026-06-22 cleanup: `20260622144706_drop_retired_ai_inventory_views.sql` removes retired `ai_*` inventory helper views. Staff-managed data remains available through neutral views such as `view_inventory_summary` and actual tables such as `inventory_transactions`.
