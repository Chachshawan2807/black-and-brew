import { google } from '@ai-sdk/google';
import { streamText, stepCountIs } from 'ai';
import { optimizeThaiTokens } from '@/utils/thaiTokenOptimizer';
import { readTableTool } from '@/app/actions/tools/database-tools';
import { internetSearchTool } from '@/app/actions/tools/search-tools';
import { EXECUTIVE_RULES } from '@/lib/agents/executive-rules';

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
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Anti-XSS and payload injection
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

    const currentThaiDate = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
    const currentIsoDate = new Date(new Date().getTime() + (7 * 60 * 60 * 1000)).toISOString().split('T')[0]; // YYYY-MM-DD

    const result = await streamText({
      model: google('gemini-2.5-flash'), // Changed to gemini-2.0-flash for stability
      messages: coreMessages,
      stopWhen: stepCountIs(10), // Increased to allow complex multi-step analysis
      // MODULE 4: PERFORMANCE_&_TOKEN_ECONOMY (Ultra-Minimalist System Prompt)
      system: `คุณคือ "บรู" AI ผู้ช่วยบริหารระบบร้าน Black-and-Brew

      [ข้อมูลบริบทและพิกัดที่ตั้งของร้าน]
      - ชื่อร้าน: BLACKANDBREW (แบล็ก แอนด์ บรู)
      - ที่ตั้งหลัก: ตำบลบึงคำพร้อย อำเภอลำลูกกา จังหวัดปทุมธานี, ประเทศไทย
      - วันนี้คือวันที่: ${currentIsoDate}
      - วันเวลาปัจจุบันของไทย: ${currentThaiDate}
      (จงใช้ข้อมูลฐานเวลานี้ในการคำนวณคำว่า วันนี้, พรุ่งนี้, หรือตารางงานล่วงหน้าเสมอ)

      คุณมีสิทธิ์เข้าถึงฐานข้อมูลหลังบ้านได้ทุกส่วน (Universal Read Access)
      หากผู้ใช้ถามข้อมูลที่เกี่ยวกับทรัพยากร บุคคล หรือสถิติ ให้ใช้ Tool ดึงข้อมูลจากฐานข้อมูลจริงมาประกอบกับกฎเกณฑ์ของธุรกิจเสมอ

      [Business Executive Rules]
      ${JSON.stringify(EXECUTIVE_RULES, null, 2)}

      [Instructions]
      - หากผู้ใช้ถามเกี่ยวกับสภาพอากาศ วันหยุด ข่าวสาร หรือข้อมูลภายนอกร้าน ให้คุณใช้เครื่องมือ \`internetSearchTool\` โดยระบบจะบังคับใส่คำค้นหาให้เจาะจงพิกัด "ตำบลบึงคำพร้อย ลำลูกกา ปทุมธานี" ร่วมด้วยเสมอ เพื่อความแม่นยำของเรดาร์สภาพอากาศรอบตัวร้านจริง 100%
      - ใช้กฎข้างต้นในการวิเคราะห์ข้อมูล เช่น ถ้าสต็อกต่ำกว่าเกณฑ์ ให้แจ้งเตือนผู้ใช้
      - ตอบสั้นกระชับจากคลังข้อมูลเท่านั้น ห้ามใช้ตัวหนา (font-bold) เด็ดขาด
      - เมื่อเรียกใช้ Tool และได้รับข้อมูลแล้ว ต้องสรุปเป็นภาษาไทยเพื่อตอบกลับเสมอ
      - ห้ามเดาข้อมูลเองเด็ดขาด ถ้าไม่มีข้อมูลให้แจ้งตามตรง
      ${sanitizedContext ? `\n\n[Live Screen Context]\nผู้ใช้กำลังดูข้อมูลนี้บนหน้าจอ:\n${sanitizedContext}\nหากผู้ใช้ถามเกี่ยวกับสิ่งที่เห็นบนหน้าจอ ให้อิงตามข้อมูล Live Context นี้ก่อน` : ''}`,
      providerOptions: {
        google: {
          generationConfig: {
            // MODULE 4: PERFORMANCE_&_TOKEN_ECONOMY (Cap Max Output Tokens)
            maxOutputTokens: 1000,
            temperature: 0.1,
          },
        },
      },
      // MODULE 4: PERFORMANCE_&_TOKEN_ECONOMY (Surgical Tools Partitioning)
      tools: {
        // Universal DB Reader (Phase 1)
        readTable: readTableTool,
        
        // Internet Search Tool
        internetSearchTool: internetSearchTool,
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('[AI_ROUTE] CRITICAL ERROR:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}