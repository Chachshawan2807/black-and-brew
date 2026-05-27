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

export const readTableTool = tool({
  description: 'สแกนและอ่านข้อมูลจากตารางใดก็ได้ในฐานข้อมูล (Universal Read Access) สามารถระบุคอลัมน์และเงื่อนไขการกรองได้',
  inputSchema: z.object({
    tableName: z.string().describe('ชื่อตารางที่ต้องการอ่าน'),
    columns: z.string().default('*').describe('คอลัมน์ที่ต้องการ (เช่น "id, name, stock")'),
    filters: z.record(z.string(), z.any()).optional().describe('เงื่อนไขการกรอง (Key-Value pair สำหรับ equality check)'),
    limit: z.number().max(100).default(50).describe('จำกัดจำนวนแถวที่ดึงมา')
  }),
  execute: async ({ tableName, columns, filters, limit }) => {
    console.log(`[AI_TOOL] Universal Read: ${tableName}`, { columns, filters, limit });
    try {
      let query = adminClient
        .from(tableName)
        .select(columns)
        .limit(limit);

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
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
    console.log(`[AI_TOOL] Get Daily Shifts for: ${date}`);
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
