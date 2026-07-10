import { tool } from 'ai';
import { z } from 'zod';
import { sanitizePromptInput } from '@/lib/security/sanitize';
import { fetchTavily } from '@/lib/external/tavily-client';

const searchQuerySchema = z
  .string()
  .min(2, 'Query too short')
  .max(200, 'Query too long')
  .refine((q) => !/<script|javascript:|data:/i.test(q), 'Invalid query characters')
  .transform((q) => sanitizePromptInput(q.trim()));

export const internetSearchTool = tool({
  description: 'ค้นหาข้อมูลปัจจุบัน ข่าวสาร หรือข้อมูลภายนอกจากอินเทอร์เน็ต',
  inputSchema: z.object({
    query: searchQuerySchema.describe('คำค้นหาข้อมูลที่ต้องการจากอินเทอร์เน็ต (2–200 ตัวอักษร)'),
  }),
  execute: async ({ query }) => {
    try {
      return await fetchTavily(query);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[AI_TOOL_ERROR] internetSearchTool failed:', message);
      return [];
    }
  },
});
