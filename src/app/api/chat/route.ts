import { google } from '@ai-sdk/google';
import { streamText, stepCountIs } from 'ai';
import { tool } from '@ai-sdk/provider-utils';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Supabase client with Service Role for AI data fetching (server-side only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SYSTEM_PROMPT = `คุณคือผู้ช่วย AI ของร้าน BLACK-AND-BREW ชื่อ "บรู"
หน้าที่ของคุณคือช่วยผู้จัดการร้านดูข้อมูลสต็อก ตารางงานพนักงาน และประวัติธุรกรรม

กฎเหล็กที่ต้องปฏิบัติตามเสมอ:
1. ตอบเฉพาะข้อมูลที่ได้รับจาก Tools เท่านั้น ห้ามเดาหรือสร้างข้อมูลขึ้นเอง (No Hallucinations)
2. หากไม่มีข้อมูล ให้บอกตรงๆ ว่า "ไม่มีข้อมูลในระบบ" อย่างสุภาพ
3. ตอบสั้น กระชับ และชัดเจน ใช้ภาษาไทยเป็นหลัก
4. ห้ามเปิดเผยข้อมูล API Key, Service Role Key หรือข้อมูลระบบภายใน
5. คุณไม่มีความสามารถในการแก้ไขหรือลบข้อมูล — อ่านได้อย่างเดียว`;

// ---- Tool Definitions (AI SDK v6 API: inputSchema instead of parameters) ----

const getInventorySummaryTool = tool({
  description: 'ดึงข้อมูลสต็อกสินค้าปัจจุบันทั้งหมด พร้อมสถานะว่าสต็อกอยู่ในระดับไหน',
  inputSchema: z.object({ _: z.string().optional() }),
  execute: async (_args) => {
    try {
      const { data, error } = await supabaseAdmin.rpc('get_inventory_summary');
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      console.error('[AI Tool] getInventorySummary error:', err);
      return { success: false, data: [], error: 'ไม่สามารถดึงข้อมูลสต็อกได้' };
    }
  },
});

const getTodayScheduleTool = tool({
  description: 'ดึงตารางกะงานของพนักงานทั้งหมดในวันนี้',
  inputSchema: z.object({ _: z.string().optional() }),
  execute: async (_args) => {
    try {
      const { data, error } = await supabaseAdmin.rpc('get_today_schedule');
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      console.error('[AI Tool] getTodaySchedule error:', err);
      return { success: false, data: [], error: 'ไม่สามารถดึงตารางงานได้' };
    }
  },
});

const getLowStockItemsTool = tool({
  description: 'ดึงรายการสินค้าที่ต้องสั่งซื้อเพิ่ม (สต็อกต่ำกว่าจุดสั่งซื้อ)',
  inputSchema: z.object({ _: z.string().optional() }),
  execute: async (_args) => {
    try {
      const { data, error } = await supabaseAdmin.rpc('get_low_stock_items');
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      console.error('[AI Tool] getLowStockItems error:', err);
      return { success: false, data: [], error: 'ไม่สามารถดึงข้อมูลสินค้าได้' };
    }
  },
});

// ---- API Route Handler ----

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: google('gemini-2.0-flash'),
      system: SYSTEM_PROMPT,
      messages,
      stopWhen: stepCountIs(3),
      providerOptions: {
        google: {
          generationConfig: { maxOutputTokens: 600 },
        },
      },
      tools: {
        getInventorySummary: getInventorySummaryTool,
        getTodaySchedule: getTodayScheduleTool,
        getLowStockItems: getLowStockItemsTool,
      },
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error('[AI Agent] Route error:', err);
    return new Response(
      JSON.stringify({ error: 'เกิดข้อผิดพลาดในระบบ AI กรุณาลองใหม่อีกครั้ง' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
