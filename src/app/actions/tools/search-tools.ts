import { tool } from 'ai';
import { z } from 'zod';
import { sanitizePromptInput } from '@/lib/security/sanitize';

const searchQuerySchema = z
  .string()
  .min(2, 'Query too short')
  .max(200, 'Query too long')
  .refine((q) => !/<script|javascript:|data:/i.test(q), 'Invalid query characters')
  .transform((q) => sanitizePromptInput(q.trim()));

export const internetSearchTool = tool({
  description: 'ค้นหาข้อมูลปัจจุบัน ข่าวสาร หรือสภาพอากาศจากอินเทอร์เน็ต',
  inputSchema: z.object({
    query: searchQuerySchema.describe('คำค้นหาข้อมูลที่ต้องการจากอินเทอร์เน็ต (2–200 ตัวอักษร)'),
  }),
  execute: async ({ query }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      console.error('[AI_TOOL_ERROR] internetSearchTool: Missing TAVILY_API_KEY');
      return [];
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: 'basic',
          max_results: 3,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results.map((result: any) => ({
        title: result.title,
        content: result.content,
        url: result.url,
      }));
    } catch (error: any) {
      console.error('[AI_TOOL_ERROR] internetSearchTool failed:', error.message);
      return [];
    }
  },
});
