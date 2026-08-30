# Supabase RLS Audit BLACKANDBREW ERP

> Audit date: 2026-07-25  
> Project: `yghzklvtuykziqlexnzh` (BLACK-AND-BREW)

## Auth model

| Layer | Mechanism |
| --- | --- |
| App gate | PIN cookies (`bb_auth_pin_verified`) verified in Server Actions |
| Supabase client | Anonymous sign-in → `authenticated` role for RLS |
| Server mutations | `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) |

Anyone with the public anon key can call PostgREST directly. RLS is the last line of defense for tables the browser can reach.

## Table coverage (24 public tables)

> Sales Report tables (`sales_records`, `sales_uploads`, `product_categories`) dropped in `20260826140000_drop_sales_report_tables.sql`.

| Table | RLS | Client access | Status |
| --- | --- | --- | --- |
| `app_preferences` | ON | authenticated read | OK |
| `audit_logs` | ON | **server only** | **Fixed** removed public ALL |
| `bean_*` (6 tables) | ON | authenticated SELECT | OK (writes via server actions) |
| `data_change_logs` | ON | scoped anon SELECT (inventory + daily report) | OK intentional realtime |
| `device_passkeys` | ON | **deny all** (no policies) | OK server only |
| `holidays` | ON | authenticated | **Fixed** removed public ALL |
| `inventory_*` | ON | authenticated | OK after anon sign-in |
| `login_history` | ON | **deny all** (no policies) | OK server only |
| `profiles` | ON | authenticated + legacy public read | **Partial** see debt |
| `push_subscriptions` | ON | `auth.uid()` scoped | OK |
| `regular_holidays` | ON | authenticated | **Fixed** removed public ALL |
| `revoked_sessions` | ON | **deny all** (no policies) | OK server only |
| `service_records` | ON | authenticated | **Fixed** removed public ALL |
| `shifts` | ON | authenticated + legacy public read | **Partial** see debt |

## Migration applied

`supabase/migrations/20260724170556_harden_rls_and_rpc_execute.sql`

Changes:

1. Removed `public` ALL policies on `audit_logs` (sales tables dropped in `20260826140000`)
2. Replaced `service_records` public policies with `authenticated` CRUD
3. Replaced `holidays` / `regular_holidays` public ALL with `authenticated` policies
4. Removed anonymous **write** policies on `shifts` and `profiles`
5. Revoked `PUBLIC` execute on SECURITY DEFINER RPCs; granted `service_role` only

## SECURITY DEFINER RPCs

These are used only from server actions / AI gateway (service role):

- `get_ai_inventory_item_details`
- `get_ai_store_status`
- `get_inventory_summary`
- `get_low_stock_items`
- `get_today_schedule`
- `record_inventory_transaction`
- `set_inventory_stock`

**Fixed:** `anon` can no longer invoke them via `/rest/v1/rpc/*`.

## Remaining debt (follow-up)

### 1. Public read on `profiles` / `shifts`

Policies still allow unauthenticated SELECT for legacy SSR on the home page (`src/app/[locale]/page.tsx` uses anon client without session).

**Recommendation:** migrate home/dashboard SSR fetches to `getSupabaseAdmin()` and drop:

- `Enable read access for all users` on `profiles`
- `Enable read access for all users` on `shifts`

### 2. Permissive `authenticated` policies

Supabase advisor flags `USING (true)` on inventory/shifts mutations. Acceptable while PIN + anon sign-in is the staff trust boundary, but a future hardening pass could add branch-scoped claims.

### 3. `data_change_logs` anon SELECT

Intentional for inventory realtime, daily report history, proactive insights, bean-order notifications, and PIN lockout alerts. Scoped by `module` / `entity_type` / `metadata.kind` see `20260810160403_insight_notification_realtime.sql`. Keep monitored.

### 4. Leaked password protection

Enable in Supabase Dashboard → Authentication → Password security (for any future email/password users).

## Verification checklist

After deploying migration:

```bash
npm run db:verify
```

Manual checks:

- [ ] PIN login still works; `ensureSupabaseSession()` runs after verify
- [ ] Schedule page loads shifts/profiles/holidays
- [ ] Maintenance page refreshes `service_records`
- [ ] Direct anon REST call to `inventory_items` without auth returns empty / 401
- [ ] Direct anon RPC `get_inventory_summary` returns permission denied

## Apply to production

```bash
# Via Supabase CLI (linked project)
supabase db push

# Or apply through Supabase MCP / Dashboard SQL editor using the migration file
```
