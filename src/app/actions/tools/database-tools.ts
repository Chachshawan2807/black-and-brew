import { createClient } from '@supabase/supabase-js';
import { tool } from 'ai';
import { z } from 'zod';

/**
 * UNIVERSAL DATABASE READER TOOL
 * 
 * This tool uses the Service Role Key to bypass RLS and read any table.
 * Restricted to SELECT operations only for safety.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ [DatabaseTool] Missing Supabase Service Role configuration. Tool may fail.');
}

// Internal Admin Client (Server-side ONLY)
const adminClient = createClient(supabaseUrl!, supabaseServiceKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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
    employee: 'employee_id'
  },
  profiles: {
    name: 'full_name'
  },
  holidays: {
    holiday_date: 'date',
    holiday_name: 'name'
  }
};

const INVENTORY_ITEMS_PRESET =
  'id, name, unit, source, order_point, target_stock, stock, order_qty';

const SERVICE_RECORDS_PRESET =
  'id, start_date, equipment, detected_problem, task_type, work_details, cost, recommended_frequency, person_in_charge, status, completion_date, notes';

function getRealColumnName(tableName: string, col: string): string {
  return COLUMN_ALIASES[tableName]?.[col] ?? col;
}

function normalizeColumns(tableName: string, columns: string): string {
  return columns
    .split(',')
    .map((col) => col.trim())
    .filter(Boolean)
    .map((col) => getRealColumnName(tableName, col))
    .join(', ');
}

export const readTableTool = tool({
  description:
    'สแกนและอ่านข้อมูลจากตารางใดก็ได้ในฐานข้อมูล (Universal Read Access) สามารถระบุคอลัมน์และเงื่อนไขการกรองได้ — inventory_items: name/stock/order_point (ไม่ใช่ item_name/quantity/min_stock); service_records: equipment/start_date/person_in_charge; shifts: start_time/end_time/status; profiles: full_name; holidays: date/name',
  inputSchema: z.object({
    tableName: z.string().describe('ชื่อตารางที่ต้องการอ่าน (เช่น shifts, profiles, holidays, inventory_items, service_records)'),
    columns: z.string().optional().describe(
      'คอลัมน์ที่ต้องการ (เช่น "id, name, stock"). หากไม่ส่ง/เป็น "*" จะใช้ preset ตามตาราง'
    ),
    filters: z.record(z.string(), z.any()).optional().describe('เงื่อนไขการกรอง (Key-Value pair สำหรับ equality check)'),
    limit: z.number().max(100).default(50).describe('จำกัดจำนวนแถวที่ดึงมา')
  }),
  execute: async ({ tableName, columns, filters, limit }) => {
    // Minimal runtime logging for performance.
    try {
      const TABLE_COLUMN_PRESETS: Record<string, string> = {
        profiles: 'id, full_name, schedule_order',
        shifts: 'id, employee_id, status, start_time, end_time, metadata',
        holidays: 'id, date, name',
        inventory_items: INVENTORY_ITEMS_PRESET,
        inventory_transactions: 'id, inventory_item_id, type, quantity, note, created_at',
        service_records: SERVICE_RECORDS_PRESET,
      };

      const normalizedColumns = (columns ?? '').trim();
      const shouldUsePreset = !normalizedColumns || normalizedColumns === '*';
      let selectedColumns = shouldUsePreset ? (TABLE_COLUMN_PRESETS[tableName] ?? '*') : columns!;
      
      if (!shouldUsePreset) {
        selectedColumns = normalizeColumns(tableName, selectedColumns);
      }

      let query = adminClient
        .from(tableName)
        .select(selectedColumns)
        .limit(limit);

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          const realKey = getRealColumnName(tableName, key);
          // Special handling for date filtering on start_time
          if (tableName === 'shifts' && realKey === 'start_time' && typeof value === 'string' && value.length === 10) {
            query = query.gte('start_time', `${value}T00:00:00`).lte('start_time', `${value}T23:59:59`);
          } else {
            query = query.eq(realKey, value);
          }
        });
      }

      const { data, error } = await query;

      if (error) {
        console.error(`[AI_TOOL] Error reading ${tableName}:`, error);
        return {
          ok: false,
          data: null,
          error: { message: error.message, details: error.details, hint: (error as any).hint ?? null },
        };
      }

      return { ok: true, data: data ?? [] };
    } catch (err: any) {
      console.error(`[AI_TOOL] Universal Read crashed:`, err);
      return {
        ok: false,
        data: null,
        error: { message: err?.message || 'Unknown error', details: err?.details ?? null, hint: null },
      };
    }
  }
});

export const getDailyShiftsTool = tool({
  description: 'ดึงข้อมูลตารางงานและกะการทำงานของพนักงานทุกคนในวันที่ระบุ (รูปแบบ YYYY-MM-DD)',
  inputSchema: z.object({
    date: z.string().describe('วันที่ต้องการดูตารางงาน รูปแบบ YYYY-MM-DD เช่น 2026-05-26')
  }),
  execute: async ({ date }) => {
    // Minimal runtime logging for performance.
    try {
      const { data: profiles, error: profileError } = await adminClient
        .from('profiles')
        .select('id, full_name, schedule_order')
        .order('schedule_order', { ascending: true });

      if (profileError) {
        console.error('[AI_TOOL] Error reading profiles:', profileError);
        return {
          ok: false,
          data: null,
          error: { message: profileError.message, details: profileError.details, hint: (profileError as any).hint ?? null },
        };
      }

      const { data: shifts, error: shiftError } = await adminClient
        .from('shifts')
        .select('employee_id, status, start_time, metadata')
        .gte('start_time', `${date}T00:00:00`)
        .lte('start_time', `${date}T23:59:59`);

      if (shiftError) {
        console.error('[AI_TOOL] Error reading shifts:', shiftError);
        return {
          ok: false,
          data: null,
          error: { message: shiftError.message, details: shiftError.details, hint: (shiftError as any).hint ?? null },
        };
      }

      const payload = (profiles || []).map((profile, index) => {
        const shift = (shifts || []).find(s => s.employee_id === profile.id);

        let shiftValue = '';
        if (shift && shift.metadata && shift.metadata.location) {
          shiftValue = shift.metadata.location;
        }

        return {
          row_order: index + 1,
          name: profile.full_name,
          shift: shiftValue,
        };
      });

      return { ok: true, data: payload };
    } catch (err: any) {
      console.error('[AI_TOOL] Get Daily Shifts crashed:', err);
      return {
        ok: false,
        data: null,
        error: { message: err?.message || 'Unknown error', details: err?.details ?? null, hint: null },
      };
    }
  }
});
