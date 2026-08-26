# Historical schema snapshots

One-shot reference schemas applied historically. **Not** applied by `supabase db push`.

Canonical changes: operational blueprints in `sql/` plus versioned migrations in `supabase/migrations/` (repo root).

| File | Purpose |
| --- | --- |
| `DB_SCHEMA.sql` | Core: profiles, shifts, inventory_items |
| `inventory_config_schema.sql` | Config table + seed |
| `regular_holidays_schema.sql` | Regular holidays per employee |
| `audit_log_schema.sql` | AI audit logging |
