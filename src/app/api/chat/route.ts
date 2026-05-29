import { google } from '@ai-sdk/google';
import { streamText, stepCountIs } from 'ai';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { readTableTool } from '@/app/actions/tools/database-tools';
import { internetSearchTool } from '@/app/actions/tools/search-tools';
import { weatherTool, getDailyReportSourcesTool } from '@/app/actions/tools/internal-sources-tools';
import { EXECUTIVE_RULES } from '@/lib/agents/executive-rules';
import { optimizeThaiTokens } from '@/utils/thaiTokenOptimizer';

// Mandatory: AI SDK v6 Standards
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // MODULE 5: DYNAMIC TOOL INJECTION — Intent Classification
    const lastMsg = messages[messages.length - 1];
    const lastMsgText = typeof lastMsg?.content === 'string'
      ? lastMsg.content
      : (lastMsg?.parts ?? [])
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');

    // MODULE 6: TOKEN ECONOMY (Tool Output Cleaning)
    // กรองข้อมูล Metadata และ ID ยาวๆ ออกก่อนส่งให้โมเดล เพื่อลดค่าใช้จ่ายและเพิ่มความเร็ว
    const cleanToolOutput = (output: any) => {
      if (!output || typeof output !== 'object') return output;
      const removeJunk = (item: any) => {
        if (!item || typeof item !== 'object') return item;
        const { id, created_at, updated_at, metadata, tenant_id, profile_id, ...rest } = item;
        return rest;
      };
      if (Array.isArray(output)) return output.map(removeJunk);
      if (output.data && Array.isArray(output.data)) {
        return { ...output, data: output.data.map(removeJunk) };
      }
      return removeJunk(output);
    };

    const wrapTool = (tool: any) => ({
      ...tool,
      execute: tool.execute ? async (args: any) => cleanToolOutput(await tool.execute(args)) : undefined
    });

    // แยกตรรกะการตรวจจับให้แม่นยำชัดเจน
    const isScheduleQuery = /กะงาน|พนักงาน|เวร|ตารางงาน|shift/i.test(lastMsgText);
    const isInventoryQuery = /สต็อก|คลัง|สินค้า|ซ่อม|บำรุง|inventory|stock|repair|maintenance/i.test(lastMsgText);
    const isWeatherQuery = /อากาศ|ฝน|อุณหภูมิ|แดด|ฝุ่น|พายุ|weather|rain/i.test(lastMsgText);
    const isExternalSearchQuery = /ค้นหา|ข่าว|เทรนด์|search|news|trend|ราคาตลาด/i.test(lastMsgText);

    // ตรวจสอบความเกี่ยวโยงกันเชิงธุรกิจ (เช่น ฝนตกจะกระทบการส่งของหรือกะงาน)
    const hasWeatherBusinessLink = (isScheduleQuery || isInventoryQuery) && /ฝน|พายุ|อากาศ|ส่งของ|ร้อน/i.test(lastMsgText);

    let tools: Record<string, any> = {};
    let dynamicMaxSteps = 1;

    if (isScheduleQuery) {
      tools.getDailyReportSourcesTool = wrapTool(getDailyReportSourcesTool);
      dynamicMaxSteps = Math.max(dynamicMaxSteps, 2);
    }
    if (isInventoryQuery) {
      tools.readTable = wrapTool(readTableTool);
      dynamicMaxSteps = Math.max(dynamicMaxSteps, 2);
    }
    if (isWeatherQuery || hasWeatherBusinessLink) {
      tools.weatherTool = wrapTool(weatherTool);
      dynamicMaxSteps = Math.max(dynamicMaxSteps, 2);
    }
    if (isExternalSearchQuery) {
      tools.internetSearchTool = wrapTool(internetSearchTool);
      dynamicMaxSteps = Math.max(dynamicMaxSteps, 4);
    }

    const enabledTools = Object.keys(tools).length > 0 ? tools : undefined;

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
        content: optimizeThaiTokens(cleanContent) // Re-integrating Thai token optimization
      };
    });

    // Note: avoid noisy production logs to keep CPU low.

    const now = new Date();
    const todayZoned = toZonedTime(now, 'Asia/Bangkok');
    const currentThaiDate = now.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    const currentIsoDate = format(todayZoned, 'yyyy-MM-dd'); // YYYY-MM-DD

    const storeLat = process.env.NEXT_PUBLIC_STORE_LAT || '13.929692';
    const storeLon = process.env.NEXT_PUBLIC_STORE_LON || '100.716933';

    const result = await streamText({
      model: google('gemini-2.5-flash'), // อัปเกรดเป็นรุ่น 2.5-flash ตามที่ระบุ
      messages: coreMessages,
      stopWhen: stepCountIs(dynamicMaxSteps), // Dynamic: internal/weather=2, external=4
      // MODULE 4: PERFORMANCE_&_TOKEN_ECONOMY (Ultra-Minimalist System Prompt)
      system: `คุณคือ "บรู" AI ผู้ช่วยผู้จัดการร้าน Black-and-Brew

      [Bru Persona & Communication Style]
      - บุคลิก: เป็นมิตร อบอุ่น และมืออาชีพเหมือนผู้ช่วยผู้จัดการร้านกาแฟที่คอยดูแลความเรียบร้อยของร้าน
      - การสนทนา: ให้ใช้ภาษาพูดที่เป็นธรรมชาติ เรียบเรียงประโยคให้ลื่นไหลเหมือนคุยกับคนจริงๆ 
      - ข้อห้าม: ห้ามตอบเป็นตารางทื่อๆ หรือใช้สัญลักษณ์ซ้ำซากตามเทมเพลตตายตัวแบบหุ่นยนต์เด็ดขาด
      - ข้อมูล: ใช้ข้อมูลตัวเลขและกฎเกณฑ์จาก EXECUTIVE_RULES อย่างแม่นยำ 100% แต่การสื่อสารต้องดู "Human-like"

      [ข้อมูลบริบทและพิกัดที่ตั้งของร้าน]
      - ชื่อร้าน: BLACKANDBREW (แบล็ก แอนด์ บรู)
      - ที่ตั้งหลัก: ตำบลบึงคำพร้อย อำเภอลำลูกกา จังหวัดปทุมธานี, ประเทศไทย
      - พิกัดทางภูมิศาสตร์ (Lat, Lon): ${storeLat}, ${storeLon}
      - วันนี้คือวันที่: ${currentIsoDate}
      - วันเวลาปัจจุบันของไทย: ${currentThaiDate}
      (จงใช้ข้อมูลฐานเวลานี้ในการคำนวณคำว่า วันนี้, พรุ่งนี้, หรือตารางงานล่วงหน้าเสมอ)

      หลักการข้อมูล: โครงสร้างนี้ยึด "Internal API-First" แบบเข้มงวด
      - ข้อมูลที่ได้จาก Tool คือ "Primary Absolute Truth"
      - ห้ามเดาข้อมูลจากความรู้เดิม หรืออินเทอร์เน็ต
      - ถ้า Tool ให้ข้อมูลไม่ครบ/ล้มเหลว ต้องรายงานตามค่าที่ได้รับจริง

      [Business Executive Rules]
      ${JSON.stringify(EXECUTIVE_RULES, null, 2)}

      [Internal API-First Orchestration / Data Reasoning Matrix]
      ห้ามเปิดเผย "chain-of-thought" แต่ให้ทำขั้นตอนคิดภายในดังนี้:
      1) Data Intake: เรียก Tool ให้ตรงโดเมนก่อน (ข้อมูลภายในใช้ readTable, ข้อมูลภายนอกใช้ internetSearchTool)
      1.1) readTable รองรับเฉพาะ equality filters เท่านั้น (eq)
      1.2) เมื่อผู้ใช้ถามงานที่มีการเปรียบเทียบ/อสมการ/คำนวณ (เช่น stock < order_point, maintenance ที่ใกล้ครบกำหนด) ห้ามคาดหวังให้ DB filter ฝั่งเซิร์ฟเวอร์ ให้ดึงข้อมูลตารางที่เกี่ยวข้องทั้งหมดด้วย preset columns แล้วค่อย filter/sort/calculate ในหน่วยความจำ (in-memory) ภายใน reasoning ของคุณ
      2) Data Exhaust: สกัดทุก element ของทุก array ใน payload ของ Tool (รวมถึง nested objects)
      3) Inventory Low-Stock Logic (BLACKANDBREW): ดึงตาราง inventory_items แล้ววนตรวจทุกแถว ถ้า stock < order_point ให้จัดเป็น low stock และคำนวณ suggested order quantity ด้วย order_qty (ถ้ามี/มากกว่า 0) หรือใช้ target_stock - stock
      4) Date Validation: อ้างวันที่ต่อผู้ใช้ต้องเป็น DD-MM-YYYY เท่านั้น (แปลงจาก YYYY-MM-DD ถ้าจำเป็น)
      5) Number Validation: headcount เป็นจำนวนเต็ม, maxPop เป็น number, daysRemaining เป็น number; ถ้าไม่มีข้อมูลให้รายงานว่าไม่มีข้อมูล
      6) Cross-reference Matrix: เชื่อมข้อมูลที่เกี่ยวข้องข้ามตารางตามคำถาม
      7) Honest Error Reporting: ถ้า Tool คืนค่า ok:false หรือข้อมูลว่าง ต้องรายงานความล้มเหลว/ความว่างตามที่ tool ระบุ

      [Instructions for Output]
      - ใช้กฎ Business Executive Rules ในการวิเคราะห์
      - ตอบเป็นภาษาไทยเท่านั้น และห้ามใช้ตัวหนา (font-bold)
      - สรุปจากข้อมูลที่ยืนยันจาก Tool เท่านั้น ห้ามเดา

      [Response Guidelines]
      เมื่อคำตอบตรงกับเงื่อนไขในกฎธุรกิจ ให้สรุปใจความสำคัญด้วยภาษาที่เข้าใจง่าย:

      กรณีสินค้าสต็อกต่ำ (low_stock_summary):
      - รายงานสินค้าที่ต้องเติม โดยระบุสต็อกปัจจุบันและจำนวนที่ควรสั่งเติมให้เหมาะสม
      - เรียงจากรายการที่เร่งด่วนที่สุด และให้คำแนะนำที่เป็นมิตร

      กรณีซ่อมบำรุง (upcoming_maintenance_summary):
      - แจ้งเตือนอุปกรณ์ที่ต้องดูแลและปัญหาที่พบ จัดลำดับตามความเร่งด่วนของสถานะงาน

      [CRITICAL PROCESS INTEGRITY RULE] หากผู้ใช้ถามข้อมูลที่เกี่ยวกับระบบร้าน BLACKANDBREW ให้คุณเรียกใช้งาน 'readTable' เพียง "1 ครั้ง" เท่านั้น และเมื่อได้รับผลลัพธ์ข้อมูลจากคลังหรือตารางซ่อมบำรุงแล้ว ให้ประมวลผลสรุปคำตอบด้วยตรรกะ In-Memory ทันที และห้ามทำการเรียกเครื่องมืออื่นใดซ้ำซ้อนในเทิร์นเดียวกันเด็ดขาด`,
      providerOptions: {
        google: {
          generationConfig: {
            // MODULE 4: PERFORMANCE_&_TOKEN_ECONOMY (Cap Max Output Tokens)
            maxOutputTokens: 1200,
            temperature: 0.1,
          },
        },
      },
      // MODULE 5: DYNAMIC TOOL INJECTION (Conditional Tools — pre-classified above)
      tools: enabledTools,
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
