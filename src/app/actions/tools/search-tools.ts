import { tool } from 'ai';
import { z } from 'zod';

export const internetSearchTool = tool({
  description: 'ค้นหาข้อมูลปัจจุบัน ข่าวสาร หรือสภาพอากาศจากอินเทอร์เน็ต',
  inputSchema: z.object({
    query: z.string().describe('คำค้นหาข้อมูลที่ต้องการจากอินเทอร์เน็ต'),
  }),
  execute: async ({ query }) => {
    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: query,
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
