import { createClient } from '@supabase/supabase-js';
import { fetchDailyShiftsByDate } from '@/lib/schedule/fetch-daily-shifts';
import type { FormattedDailyShifts } from '@/lib/schedule/format-daily-shifts';
import { isItemNeedingReorder } from '@/lib/inventory-stock';

// ─────────────────────────────────────────────────────────────────────────────
// AI DATA GATEWAY (AI-GATEWAY-P3)
//
// Single source of truth for every read the AI layer performs against Supabase.
// All access funnels through here so column presets (DEC-069) and the
// SECURITY DEFINER RPCs in `sql/ai_agent_views.sql` stay the only doorways.
// ─────────────────────────────────────────────────────────────────────────────

function getAdminClient() {
  // Read env at call time (not module load) so server actions and tests that
  // configure env after import still resolve the Service Role credentials.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase Service Role configuration');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AI-READABLE TABLES — every public ERP table the chat layer may query.
// Column presets (DEC-069) still block arbitrary selects and crypto secrets.
// ─────────────────────────────────────────────────────────────────────────────
export const AI_ALLOWED_TABLES = [
  'profiles',
  'shifts',
  'holidays',
  'regular_holidays',
  'inventory_items',
  'inventory_config',
  'inventory_transactions',
  'inventory_count_verifications',
  'service_records',
  'sales_uploads',
  'sales_records',
  'product_categories',
  'audit_logs',
  'login_history',
  'data_change_logs',
  'revoked_sessions',
  'push_subscriptions',
  'device_passkeys',
] as const;

export type AiReadableTable = (typeof AI_ALLOWED_TABLES)[number];

export function isAiReadableTable(tableName: string): tableName is AiReadableTable {
  return (AI_ALLOWED_TABLES as readonly string[]).includes(tableName);
}

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN ALIASES — map AI-friendly names to real DB columns
// ─────────────────────────────────────────────────────────────────────────────
const COLUMN_ALIASES: Record<string, Record<string, string>> = {
  inventory_items: {
    item_name: 'name',
    quantity: 'stock',
    min_stock: 'order_point',
  },
  service_records: {
    machine_name: 'equipment',
    maintenance_date: 'start_date',
    recorded_at: 'start_date',
    operator: 'person_in_charge',
    description: 'work_details',
  },
  shifts: {
    shift_date: 'start_time',
    date: 'start_time',
    employee: 'employee_id',
  },
  profiles: { name: 'full_name' },
  holidays: { holiday_date: 'date', holiday_name: 'name' },
  sales_records: {
    product: 'product_name',
    date: 'sale_date',
    amount: 'total_amount',
  },
  sales_uploads: { filename: 'file_name', uploaded_at: 'upload_date' },
  product_categories: { product: 'product_name' },
  regular_holidays: { employee_id: 'profile_id', weekday: 'day_of_week' },
  data_change_logs: { module_name: 'module', entity: 'entity_type' },
};

// ─────────────────────────────────────────────────────────────────────────────
// TABLE PRESETS (DEC-069) — the ONLY columns the AI may ever read per table.
// Crypto secrets (Web Push keys, WebAuthn public_key) are excluded by design.
// ─────────────────────────────────────────────────────────────────────────────
export const TABLE_COLUMN_PRESETS: Record<AiReadableTable, string> = {
  profiles:
    'id, full_name, is_active, schedule_order, dashboard_order, display_order, avatar_url, created_at',
  shifts: 'id, employee_id, status, start_time, end_time, metadata, created_at',
  holidays: 'id, date, name, created_at',
  regular_holidays: 'id, profile_id, day_of_week, created_at',
  inventory_items:
    'id, name, unit, source, order_point, target_stock, stock, order_qty, sort_order, ' +
    'count_policy, sufficiency_order_qty, updated_at',
  inventory_config: 'id, settings',
  inventory_transactions:
    'id, inventory_item_id, type, quantity, note, balance_after, created_at',
  inventory_count_verifications:
    'id, inventory_item_id, counted_qty, system_stock_qty, matched, counted_at, created_at',
  service_records:
    'id, start_date, equipment, detected_problem, task_type, work_details, ' +
    'cost, recommended_frequency, person_in_charge, status, completion_date, notes, created_at',
  sales_uploads:
    'id, file_name, upload_date, total_records, status, analysis_summary, created_at',
  sales_records:
    'id, upload_id, sale_date, product_name, category, quantity, unit_price, ' +
    'total_amount, payment_method, notes, created_at',
  product_categories: 'id, product_name, category, is_ai_generated, created_at, updated_at',
  audit_logs:
    'id, action_type, entity_type, entity_id, old_value, new_value, user_id, ' +
    'user_email, timestamp, ip_address, status',
  login_history:
    'id, event_type, occurred_at, ip_address, user_agent, device_type, device_vendor, ' +
    'device_model, os_name, os_version, browser_name, browser_version, access_level, ' +
    'status, failure_reason, session_fingerprint, metadata, created_at',
  data_change_logs:
    'id, occurred_at, actor_id, actor_label, actor_access_level, action, module, ' +
    'entity_type, entity_id, entity_label, field_changes, old_value, new_value, source, ' +
    'ip_address, user_agent, status, error_message, metadata, created_at',
  revoked_sessions: 'session_fingerprint, revoked_at, revoked_reason',
  push_subscriptions:
    'id, user_id, profile_id, branch_id, client_session_id, user_agent, prefs_json, ' +
    'created_at, updated_at',
  device_passkeys:
    'id, credential_id, device_label, session_fingerprint, access_level, counter, ' +
    'transports, registered_at, last_used_at',
};

// ─────────────────────────────────────────────────────────────────────────────
// TABLE-SPECIFIC SAFE MAXIMUM LIMITS
// ─────────────────────────────────────────────────────────────────────────────
export const TABLE_MAX_LIMITS: Record<AiReadableTable, number> = {
  inventory_items: 1000,
  inventory_transactions: 1000,
  inventory_count_verifications: 1000,
  service_records: 1000,
  sales_records: 2000,
  data_change_logs: 2000,
  login_history: 500,
  audit_logs: 500,
  product_categories: 500,
  shifts: 500,
  profiles: 200,
  holidays: 366,
  regular_holidays: 200,
  sales_uploads: 100,
  inventory_config: 50,
  revoked_sessions: 200,
  push_subscriptions: 100,
  device_passkeys: 50,
};

export const DEFAULT_TABLE_MAX_LIMIT = 200;

export function getRealColumnName(tableName: string, col: string): string {
  return COLUMN_ALIASES[tableName]?.[col] ?? col;
}

interface GatewayError {
  message: string;
  details: unknown;
  hint: unknown;
}

export interface TablePresetResult {
  ok: boolean;
  rows: Record<string, unknown>[];
  effectiveLimit: number;
  presetColumns?: string;
  error?: GatewayError;
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchInventorySummary — comprehensive store status via SECURITY DEFINER RPC.
// Returns the shaped JSON from `get_ai_store_status` (sql/ai_agent_views.sql).
// ─────────────────────────────────────────────────────────────────────────────
export interface StoreStatus {
  timestamp?: string;
  shifts?: unknown[];
  inventory_summary?: Record<string, unknown>[];
  low_stock_items?: Record<string, unknown>[];
}

export async function fetchInventorySummary(): Promise<StoreStatus> {
  const admin = getAdminClient();
  const { data, error } = await admin.rpc('get_ai_store_status');

  if (error) {
    console.error('[ai-data-gateway] get_ai_store_status:', error.message, error.details);
    throw error;
  }

  const status = (data ?? {}) as StoreStatus;
  const summary = status.inventory_summary ?? [];
  const lowStock = summary.filter((item) =>
    isItemNeedingReorder(item.stock, item.order_point, item.target_stock)
  );

  return { ...status, low_stock_items: lowStock };
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchShiftsByDate — reuse the canonical daily-shift formatter (DEC-068).
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchShiftsByDate(date: string): Promise<FormattedDailyShifts> {
  return fetchDailyShiftsByDate(date);
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchTablePreset — preset-locked generic read. Never selects outside preset.
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchTablePreset(
  tableName: string,
  filters?: Record<string, unknown>,
  limit?: number,
): Promise<TablePresetResult> {
  if (!isAiReadableTable(tableName)) {
    return {
      ok: false,
      rows: [],
      effectiveLimit: 0,
      error: {
        message: `Table is not AI-readable: ${tableName}`,
        details: null,
        hint: `Use one of: ${AI_ALLOWED_TABLES.join(', ')}`,
      },
    };
  }

  const presetColumns = TABLE_COLUMN_PRESETS[tableName];
  const effectiveLimit = limit ?? TABLE_MAX_LIMITS[tableName] ?? DEFAULT_TABLE_MAX_LIMIT;

  try {
    const admin = getAdminClient();
    let query = admin.from(tableName).select(presetColumns).limit(effectiveLimit);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        const realKey = getRealColumnName(tableName, key);

        // Date-only filter on shifts → expand to a full-day range.
        if (
          tableName === 'shifts' &&
          realKey === 'start_time' &&
          typeof value === 'string' &&
          value.length === 10
        ) {
          query = query
            .gte('start_time', `${value}T00:00:00`)
            .lte('start_time', `${value}T23:59:59`);
        } else {
          query = query.eq(realKey, value);
        }
      });
    }

    const { data, error } = await query;

    if (error) {
      console.error(`[ai-data-gateway] read ${tableName}:`, error.message, error.details);
      return {
        ok: false,
        rows: [],
        effectiveLimit,
        presetColumns,
        error: {
          message: error.message,
          details: error.details,
          hint: (error as { hint?: unknown }).hint ?? null,
        },
      };
    }

    return {
      ok: true,
      rows: (data ?? []) as unknown as Record<string, unknown>[],
      effectiveLimit,
      presetColumns,
    };
  } catch (err) {
    const e = err as { message?: string; details?: unknown };
    console.error(`[ai-data-gateway] read ${tableName} crashed:`, e?.message);
    return {
      ok: false,
      rows: [],
      effectiveLimit,
      presetColumns,
      error: { message: e?.message ?? 'Unknown error', details: e?.details ?? null, hint: null },
    };
  }
}
