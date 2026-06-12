# SQL Files Index

## Source of truth

Official schema changes: **`supabase/migrations/`**

Apply pending migrations manually via **`scripts/apply-pending-migrations.sql`** (Supabase Dashboard) or `supabase db push` when CLI is linked.

Verify remote state: `npm run db:verify`

## Directory roles

| Location | Purpose |
|----------|---------|
| `supabase/migrations/` | Versioned migrations (login_history, data_change_logs, revoked_sessions, inventory ADD/DELETE) |
| `scripts/apply-pending-migrations.sql` | Bundled manual apply for Dashboard |
| `sql/` | Operational scripts (RLS, stock sync, AI views) — may duplicate migrations; prefer migration file |
| Root `*.sql` | Historical reference schemas (`DB_SCHEMA.sql`, `sales_schema.sql`, etc.) — applied historically |

## Duplicates (use migration version)

| Change | Canonical migration |
|--------|---------------------|
| Inventory ADD/DELETE history | `supabase/migrations/20260612140000_inventory_add_delete_history.sql` |
| Revoked sessions | `supabase/migrations/20260612200000_revoked_sessions.sql` |
| Data change logs | `supabase/migrations/20260612120000_create_data_change_logs.sql` |

Legacy copies in `sql/` remain for reference; do not edit without syncing the migration.
