import { google } from '@ai-sdk/google';
import { streamText, stepCountIs } from 'ai';
import { format } from 'date-fns';
import { optimizeThaiTokens } from '@/utils/thaiTokenOptimizer';
import { toZonedTime } from 'date-fns-tz';
import { readTableTool } from '@/app/actions/tools/database-tools';
import { internetSearchTool } from '@/app/actions/tools/search-tools';
import { weatherTool, getDailyReportSourcesTool } from '@/app/actions/tools/internal-sources-tools';
import { EXECUTIVE_RULES } from '@/lib/agents/executive-rules';

// Mandatory: AI SDK v6 Standards
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
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

    // MODULE 5: DYNAMIC TOOL INJECTION — Intent Classification
    const lastMsg = messages[messages.length - 1];
    const lastMsgText = typeof lastMsg?.content === 'string'
      ? lastMsg.content
      : (lastMsg?.parts ?? [])
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');

    // แยกตรรกะการตรวจจับให้แม่นยำชัดเจน
    const isScheduleQuery = /กะงาน|พนักงาน|เวร|ตารางงาน|shift/i.test(lastMsgText);
    const isInventoryQuery = /สต็อก|คลัง|สินค้า|ซ่อม|บำรุง|inventory|stock|repair|maintenance/i.test(lastMsgText);
    const isWeatherQuery = /อากาศ|ฝน|อุณหภูมิ|แดด|ฝุ่น|พายุ|weather|rain/i.test(lastMsgText);
    const isExternalSearchQuery = /ค้นหา|ข่าว|เทรนด์|search|news|trend|ราคาตลาด/i.test(lastMsgText);

    let enabledTools: Record<string, any> | undefined;
    let dynamicMaxSteps = 1;

    if (isScheduleQuery) {
      // บังคับใช้ทูลจัดรายงานพนักงานสำเร็จรูปที่มีการดึง Profile Name และจัดการสิทธิ์ AdminClient ไว้แล้ว
      enabledTools = { getDailyReportSourcesTool: getDailyReportSourcesTool };
      dynamicMaxSteps = 2;
    } else if (isInventoryQuery) {
      enabledTools = { readTable: readTableTool };
      dynamicMaxSteps = 2;
    } else if (isWeatherQuery) {
      enabledTools = { weatherTool: weatherTool };
      dynamicMaxSteps = 2;
    } else if (isExternalSearchQuery) {
      enabledTools = { internetSearchTool: internetSearchTool };
      dynamicMaxSteps = 4;
    }

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

    // Note: avoid noisy production logs to keep CPU low.

    const now = new Date();
    const todayZoned = toZonedTime(now, 'Asia/Bangkok');
    const currentThaiDate = now.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    const currentIsoDate = format(todayZoned, 'yyyy-MM-dd'); // YYYY-MM-DD

    const result = await streamText({
      model: google('gemini-2.5-flash'), // Changed to gemini-2.0-flash for stability
      messages: coreMessages,
      stopWhen: stepCountIs(dynamicMaxSteps), // Dynamic: internal/weather=2, external=4
      // MODULE 4: PERFORMANCE_&_TOKEN_ECONOMY (Ultra-Minimalist System Prompt)
      system: `คุณคือ "บรู" AI ผู้ช่วยบริหารระบบร้าน Black-and-Brew

      [ข้อมูลบริบทและพิกัดที่ตั้งของร้าน]
      - ชื่อร้าน: BLACKANDBREW (แบล็ก แอนด์ บรู)
      - ที่ตั้งหลัก: ตำบลบึงคำพร้อย อำเภอลำลูกกา จังหวัดปทุมธานี, ประเทศไทย
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

      [Structured Thai Response Templates — MANDATORY]
      เมื่อคำตอบตรงกับ trigger ใน thai_response_templates ของ Business Executive Rules ต้องจัดรูปแบบตาม template นั้นอย่างเคร่งครัด:

      กรณีสินค้าสต็อกต่ำ (low_stock_summary):
      - ขึ้นหัวข้อด้วย header จาก template
      - แสดงรายการตาม format_rules ครบทั้ง 4 ฟิลด์ (ชื่อสินค้า, สต็อกปัจจุบัน+หน่วย, จุดสั่งซื้อ, จำนวนแนะนำสั่งเติม)
      - เรียงจากสินค้าที่ขาดมากที่สุดก่อน (stock ต่ำสุดเทียบ order_point)
      - ปิดท้ายด้วย footer สรุปจำนวนรวม
      - ถ้าไม่มีสินค้าต่ำกว่าเกณฑ์ ใช้ข้อความจาก empty_case

      กรณีซ่อมบำรุง (upcoming_maintenance_summary):
      - ขึ้นหัวข้อด้วย header จาก template
      - แสดงรายการตาม format_rules ครบทั้ง 3 ฟิลด์ (ชื่ออุปกรณ์, ปัญหาล่าสุด, คำแนะนำเบื้องต้น)
      - จัดลำดับตาม urgency_logic (pending/in_progress ก่อน completed, ประเมิน frequency)
      - ถ้าไม่มีรายการค้าง ใช้ข้อความจาก empty_case

      [CRITICAL PROCESS INTEGRITY RULE]
      - หากผู้ใช้ถามข้อมูลที่เกี่ยวกับระบบร้าน BLACKANDBREW ให้คุณเรียกใช้งาน 'readTable' เพียง "1 ครั้ง" เท่านั้น
      - เมื่อได้รับผลลัพธ์ข้อมูลจากคลังหรือตารางซ่อมบำรุงแล้ว ให้ประมวลผลสรุปคำตอบด้วยตรรกะ In-Memory ทันที และห้ามทำการเรียกเครื่องมืออื่นใดซ้ำซ้อนในเทิร์นเดียวกันเด็ดขาด
      ${sanitizedContext ? `\n\n[Live Screen Context]\nผู้ใช้กำลังดูข้อมูลนี้บนหน้าจอ:\n${sanitizedContext}\nหากผู้ใช้ถามเกี่ยวกับสิ่งที่เห็นบนหน้าจอ ให้อิงตามข้อมูล Live Context นี้ก่อน` : ''}`,
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
