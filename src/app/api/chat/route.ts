import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { optimizeThaiTokens } from '@/utils/thaiTokenOptimizer';

// Mandatory: AI SDK v6 Standards
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    console.log('[AI_ROUTE] Request Received');
    const { messages, clientContext } = await req.json();

    // MODULE 3: SYSTEM_SECURITY_HARDENING (Prompt Injection Guard)
    const sanitizedContext = typeof clientContext === 'string'
      ? optimizeThaiTokens(
          clientContext
            .replace(/```[\s\S]*?```/g, '')
            .replace(/\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>|###\s*(system|user|assistant)/gi, '')
            .replace(/ignore previous instructions?|forget (all|your|prior)|you are now|act as|jailbreak/gi, '')
        ).slice(0, 1000)
      : null;

    // MODULE 4: PERFORMANCE_&_TOKEN_ECONOMY (Sliding Window Memory)
    const recentMessages = messages.slice(-4);

    // Data Mapping: Convert messages to CoreMessage schema safely
    const coreMessages = recentMessages.map((m: any) => {
      let cleanContent = m.content;

      if (!cleanContent && m.parts && Array.isArray(m.parts)) {
        cleanContent = m.parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('');
      }

      if (cleanContent === undefined || cleanContent === null) {
        cleanContent = '';
      }

      return {
        role: m.role,
        content: optimizeThaiTokens(cleanContent)
      };
    });

    console.log('[AI_ROUTE] Optimized Messages Mapped (Count:', coreMessages.length, ')');
    console.log('[AI_ROUTE] Calling Gemini with Surgical Tools...');

    const result = await streamText({
      model: google('gemini-2.0-flash'),
      messages: coreMessages,
      // MODULE 4: PERFORMANCE_&_TOKEN_ECONOMY (Ultra-Minimalist System Prompt)
      system: `คุณคือ "บรู" AI ร้าน Black-and-Brew ตอบสั้นกระชับจากคลังข้อมูลเท่านั้น ห้ามใช้ตัวหนา (font-bold) เด็ดขาด${sanitizedContext ? `\n\n[Live Screen Context]\nผู้ใช้กำลังดูข้อมูลนี้บนหน้าจอ:\n${sanitizedContext}\nหากผู้ใช้ถามเกี่ยวกับสิ่งที่เห็นบนหน้าจอ ให้อิงตามข้อมูล Live Context นี้ก่อน` : ''}`,
      providerOptions: {
        google: {
          generationConfig: {
            // MODULE 4: PERFORMANCE_&_TOKEN_ECONOMY (Cap Max Output Tokens)
            maxOutputTokens: 600,
            temperature: 0.1, // ตั้งค่าต่ำเพื่อให้ AI ตอบเฉพาะข้อเท็จจริง ไม่พรรณนายาว
          },
        },
      },
      // MODULE 4: PERFORMANCE_&_TOKEN_ECONOMY (Surgical Tools Partitioning)
      tools: {
        // ดึงเฉพาะตารางงานวันนี้ ไม่ดึงสต็อกสินค้าพ่วงมาด้วย
        getTodaySchedule: tool({
          description: 'ดึงเฉพาะตารางงานของพนักงานทุกคนที่เข้างานในวันนี้',
          inputSchema: z.object({ _: z.string().optional().describe('dummy field') }),
          execute: async () => {
            console.log('[AI_TOOL] Executing getTodaySchedule (Surgical Fetch)');
            const { data, error } = await supabase.rpc('get_today_schedule');
            console.log('[AI_TOOL] Supabase RPC Response (getTodaySchedule):', { count: data?.length, error });
            if (error) throw new Error(error.message);
            return data || [];
          },
        }),

        // ดึงเฉพาะของที่ขาดสต็อก สินค้าปกติจะไม่ถูกส่งไปให้เปลือง Token
        getLowStockItems: tool({
          description: 'ดึงเฉพาะรายการสินค้าในสต็อกที่เหลือน้อยกว่าจุดสั่งซื้อและต้องดำเนินการสั่งเพิ่ม',
          inputSchema: z.object({ _: z.string().optional().describe('dummy field') }),
          execute: async () => {
            console.log('[AI_TOOL] Executing getLowStockItems (Surgical Fetch)');
            const { data, error } = await supabase.rpc('get_low_stock_items');
            console.log('[AI_TOOL] Supabase RPC Response (getLowStockItems):', { count: data?.length, error });
            if (error) throw new Error(error.message);
            return data || [];
          },
        }),

        // ค้นหาสต็อกแบบจำกัดข้อมูล และคัดเลือกเอาเฉพาะคอลัมน์สำคัญ
        searchInventory: tool({
          description: 'ค้นหาข้อมูลสินค้าในคลังตามคีย์เวิร์ดชื่อสินค้า',
          inputSchema: z.object({
            query: z.string().describe('ชื่อสินค้าที่ต้องการค้นหา')
          }),
          execute: async ({ query }) => {
            console.log('[AI_TOOL] Executing searchInventory for:', query);
            const { data, error } = await supabase
              .from('inventory_items')
              .select('id, name, stock, unit') // MODULE 4: PERFORMANCE_&_TOKEN_ECONOMY (Restricted Query Fetching)
              .ilike('name', `%${query}%`)
              .limit(8); // MODULE 4: PERFORMANCE_&_TOKEN_ECONOMY (Result Limiting)
            console.log('[AI_TOOL] Supabase Response (searchInventory):', { count: data?.length, error });
            if (error) throw new Error(error.message);
            return data || [];
          },
        }),

        getInventoryItemDetails: tool({
          description: 'ดึงข้อมูลรายละเอียดเชิงลึกของสินค้าคงคลังรายชิ้นด้วย ID',
          inputSchema: z.object({
            itemId: z.string().uuid().describe('ID ของสินค้า')
          }),
          execute: async ({ itemId }) => {
            console.log('[AI_TOOL] Executing getInventoryItemDetails for ID:', itemId);
            const { data, error } = await supabase.rpc('get_ai_inventory_item_details', { item_id: itemId });
            console.log('[AI_TOOL] Supabase RPC Response (getInventoryItemDetails):', { data, error });
            if (error) throw new Error(error.message);
            return data;
          },
        }),

        recordTransaction: tool({
          description: 'บันทึกรายการเพิ่มเข้า (IN) หรือตัดจ่ายออก (OUT) ของสินค้าในคลัง',
          inputSchema: z.object({
            productId: z.string().uuid().describe('ID ของสินค้า'),
            type: z.enum(['IN', 'OUT']).describe('ประเภทรายการ'),
            quantity: z.number().positive().describe('จำนวน'),
            note: z.string().optional().describe('หมายเหตุ')
          }),
          execute: async ({ productId, type, quantity, note }) => {
            console.log('[AI_TOOL] Executing recordTransaction:', { productId, type, quantity });
            const { data, error } = await supabase.rpc('record_inventory_transaction', {
              p_product_id: productId,
              p_type: type,
              p_quantity: quantity,
              p_note: note || ''
            });
            console.log('[AI_TOOL] Supabase RPC Response (recordTransaction):', { data, error });
            if (error) throw new Error(error.message);
            return data;
          },
        }),
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('[AI_ROUTE] CRITICAL ERROR:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}