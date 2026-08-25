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
| `sql/historical/` | Historical one-shot schemas (`DB_SCHEMA.sql`, `sales_schema.sql`, etc.) — applied historically |

## Reference blueprints (`sql/`)

| File | Purpose |
| --- | --- |
| `record_inventory_transaction.sql` | Atomic IN/OUT RPC — used by Quick Entry and bulk quick actions |
| `record_branch_withdrawal_batch.sql` | Atomic branch-withdrawal batch RPC — branch 2 stock IN |
| `sync_inventory_stock.sql` | `set_inventory_stock` RPC, order_qty trigger, REPLICA IDENTITY |
| `fix_inventory_rls.sql` | RLS hardening — authenticated-only |
| `ai_agent_views.sql` | AI gateway neutral views/RPCs (`view_today_shifts`, `view_inventory_summary`, `get_ai_store_status`) |

## Canonical migrations (`supabase/migrations/`)

Versioned schema history lives only under `supabase/migrations/`. Do not maintain a duplicate file-by-file table here — it drifts.

- List / inspect: files in `supabase/migrations/`
- Narrative of tables and RPCs: `docs/database.md`
- Verify remote matches repo: `npm run db:verify`

## Cleanup notes

Do **not** delete or squash applied migrations — history must stay linear for `supabase db push` / remote checksums. Later migrations may drop objects created earlier (e.g. Market Insights `local_events`, recommended target stock) or reset accuracy history; that is intentional. Keep `sql/historical/` as long-term archive references for core tables created before the migrations folder existed.