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
      throw new Error(`Failed to read table ${tableName}: ${error.message}`);
    }

    return data;
  }
});
