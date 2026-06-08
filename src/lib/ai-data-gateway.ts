import { createClient } from '@supabase/supabase-js';
import { fetchDailyShiftsByDate } from '@/lib/schedule/fetch-daily-shifts';
import type { FormattedDailyShifts } from '@/lib/schedule/format-daily-shifts';

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
// COLUMN ALIASES — map AI-friendly names to real DB columns
// ─────────────────────────────────────────────────────────────────────────────
export const COLUMN_ALIASES: Record<string, Record<string, string>> = {
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
};

// ─────────────────────────────────────────────────────────────────────────────
// TABLE PRESETS (DEC-069) — the ONLY columns the AI may ever read per table.
// ─────────────────────────────────────────────────────────────────────────────
export const TABLE_COLUMN_PRESETS: Record<string, string> = {
  profiles: 'id, full_name, schedule_order',
  shifts: 'id, employee_id, status, start_time, end_time, metadata',
  holidays: 'id, date, name',
  inventory_items:
    'id, name, unit, source, order_point, target_stock, stock, order_qty, updated_at',
  inventory_transactions: 'id, inventory_item_id, type, quantity, note, created_at',
  service_records:
    'id, start_date, equipment, detected_problem, task_type, work_details, ' +
    'cost, recommended_frequency, person_in_charge, status, completion_date, notes',
};

// ─────────────────────────────────────────────────────────────────────────────
// TABLE-SPECIFIC SAFE MAXIMUM LIMITS
// ─────────────────────────────────────────────────────────────────────────────
export const TABLE_MAX_LIMITS: Record<string, number> = {
  inventory_items: 1000,
  service_records: 1000,
  profiles: 200,
  shifts: 500,
  holidays: 366,
  inventory_transactions: 500,
};

export function getRealColumnName(tableName: string, col: string): string {
  return COLUMN_ALIASES[tableName]?.[col] ?? col;
}

export interface GatewayError {
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

  return (data ?? {}) as StoreStatus;
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
  const presetColumns = TABLE_COLUMN_PRESETS[tableName];
  if (!presetColumns) {
    return {
      ok: false,
      rows: [],
      effectiveLimit: 0,
      error: {
        message: `No column preset defined for table: ${tableName}`,
        details: null,
        hint: 'Use an allowed tableName from the preset list.',
      },
    };
  }

  const effectiveLimit = limit ?? TABLE_MAX_LIMITS[tableName] ?? 200;

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
