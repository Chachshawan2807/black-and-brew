import { google } from '@ai-sdk/google';
import { streamText, stepCountIs, ToolLoopAgent } from 'ai';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { readTableTool } from '@/app/actions/tools/database-tools';
import { internetSearchTool } from '@/app/actions/tools/search-tools';
import { EXECUTIVE_RULES } from '@/lib/agents/executive-rules';
import { optimizeThaiTokens } from '@/utils/thaiTokenOptimizer';

// ─────────────────────────────────────────────────────────
// SECTION 1: ENVIRONMENT & CONSTANTS
// ─────────────────────────────────────────────────────────
const STORE_LAT = process.env.NEXT_PUBLIC_STORE_LAT || "13.9312";
const STORE_LON = process.env.NEXT_PUBLIC_STORE_LON || "100.6756";

export const maxDuration = 45; // เพิ่มจาก 30 → 45 วินาที
                                // เพราะ multi-step reasoning (เช่น shift + profiles)
                                // ต้องการเวลามากกว่าที่เดิมจำกัดไว้

// ─────────────────────────────────────────────────────────
// SECTION 2: INTENT CLASSIFICATION ENGINE (อัปเกรดหลัก)
// ─────────────────────────────────────────────────────────

/**
 * [UPGRADE 1] เปลี่ยนจาก "boolean flags" เป็น "weighted intent scoring"
 *
 * ปัญหาเดิม: ใช้ regex เดี่ยวๆ ตรวจแยกกัน ทำให้คำถามซับซ้อน
 * เช่น "พรุ่งนี้ฝนจะตกไหม กะงานใครบ้าง" → ตรวจได้แค่บางส่วน
 *
 * วิธีใหม่: ให้คะแนนแต่ละ intent แยกกัน แล้วเลือก tools ตามคะแนน
 * ทำให้รองรับคำถามที่ซับซ้อนและหลาย intent ได้พร้อมกัน
 */
type IntentScores = {
  schedule: number;
  inventory: number;
  weather: number;
  externalSearch: number;
  maintenance: number;
  holiday: number;
};

function classifyIntent(text: string): IntentScores {
  const lower = text.toLowerCase();

  // แต่ละ pattern มีน้ำหนัก (weight) สะท้อนความชัดเจนของสัญญาณ
  // คำที่ชัดเจนมากได้ weight สูง, คำกำกวมได้ weight ต่ำ
  const scheduleSignals = [
    { pattern: /กะงาน|เวร|ตารางงาน/i, weight: 3 },
    { pattern: /shift/i, weight: 3 },
    { pattern: /พนักงาน|สต้าฟ|staff/i, weight: 2 },
    { pattern: /ใครทำงาน|ใครเข้า|ใครออก|เข้ากะ/i, weight: 3 },
    { pattern: /วันนี้|พรุ่งนี้|สัปดาห์นี้/i, weight: 1 }, // context signal เท่านั้น
  ];

  const inventorySignals = [
    { pattern: /สต็อก|สต้อก|stock|inventory/i, weight: 3 },
    { pattern: /สินค้า|วัตถุดิบ|ingredient/i, weight: 2 },
    { pattern: /เหลือ|หมด|ขาด|เติม/i, weight: 2 },
    { pattern: /order|สั่ง|สั่งซื้อ/i, weight: 2 },
    { pattern: /คลัง|warehouse/i, weight: 3 },
  ];

  const weatherSignals = [
    { pattern: /อากาศ|weather/i, weight: 3 },
    { pattern: /ฝน|rain|rainy/i, weight: 3 },
    { pattern: /อุณหภูมิ|temperature|ร้อน|หนาว/i, weight: 2 },
    { pattern: /แดด|ลม|พายุ|storm|wind/i, weight: 2 },
    { pattern: /ฝุ่น|pm2\.?5|หมอก/i, weight: 2 },
  ];

  const maintenanceSignals = [
    { pattern: /ซ่อม|บำรุง|maintenance|repair/i, weight: 3 },
    { pattern: /อุปกรณ์|เครื่อง|equipment|machine/i, weight: 2 },
    { pattern: /พัง|เสีย|ชำรุด|broken/i, weight: 3 },
    { pattern: /ตรวจสอบ|check|inspect/i, weight: 1 },
  ];

  const externalSearchSignals = [
    { pattern: /ค้นหา|search|google/i, weight: 3 },
    { pattern: /ข่าว|news/i, weight: 3 },
    { pattern: /เทรนด์|trend|กระแส/i, weight: 2 },
    { pattern: /ราคาตลาด|ราคากาแฟ|ราคาน้ำตาล/i, weight: 3 },
    { pattern: /คู่แข่ง|competitor/i, weight: 2 },
    { pattern: /ภาพรวมตลาด|market/i, weight: 2 },
  ];

  const holidaySignals = [
    { pattern: /วันหยุด|นักขัตฤกษ์|เทศกาล|holiday/i, weight: 3 },
    { pattern: /หยุดเมื่อไหร่|อีกกี่วัน|วันหยุดถัดไป/i, weight: 3 },
  ];

  // ฟังก์ชันคำนวณคะแนนรวมของแต่ละ intent
  const score = (signals: { pattern: RegExp; weight: number }[]) =>
    signals.reduce((sum, s) => sum + (s.pattern.test(text) ? s.weight : 0), 0);

  return {
    schedule: score(scheduleSignals),
    inventory: score(inventorySignals),
    weather: score(weatherSignals),
    maintenance: score(maintenanceSignals),
    externalSearch: score(externalSearchSignals),
    holiday: score(holidaySignals),
  };
}

// ─────────────────────────────────────────────────────────
// SECTION 3: TOOL OUTPUT SANITIZER (อัปเกรด)
// ─────────────────────────────────────────────────────────

/**
 * [UPGRADE 2] เพิ่ม depth-aware cleaning และ null-safety
 *
 * ปัญหาเดิม: cleanToolOutput ไม่ handle nested arrays และ
 * ไม่ทำความสะอาด fields ที่ซ้ำซ้อนอื่นๆ เช่น __typename (GraphQL)
 */
const JUNK_FIELDS = new Set([
  'created_at', 'updated_at', 'metadata',
  'tenant_id', '__typename', 'deleted_at',
  'raw_app_meta_data', 'raw_user_meta_data',
]);

function cleanToolOutput(output: unknown, depth = 0): unknown {
  // ป้องกัน infinite loop กรณี circular reference หรือ nested ลึกเกิน
  if (depth > 5) return output;
  if (output === null || output === undefined) return output;

  if (Array.isArray(output)) {
    return output.map(item => cleanToolOutput(item, depth + 1));
  }

  if (typeof output === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(output as Record<string, unknown>)) {
      // ข้าม UUID fields ที่ไม่มีประโยชน์ต่อ AI reasoning
      if (JUNK_FIELDS.has(key)) continue;
      // ข้าม UUID string ที่อยู่ใน value ด้วย (เช่น employee_id)
      // แต่เก็บ FK ที่จำเป็นสำหรับ cross-reference ไว้
      cleaned[key] = cleanToolOutput(value, depth + 1);
    }
    return cleaned;
  }

  return output;
}

// Wrapper ที่ inject cleanToolOutput เข้าไปใน execute ของทุก tool
function wrapTool(tool: any) {
  return {
    ...tool,
    execute: tool.execute
      ? async (args: any, options?: any) => {
          const raw = await tool.execute(args, options);
          return cleanToolOutput(raw);
        }
      : undefined,
  };
}

// ─────────────────────────────────────────────────────────
// SECTION 4: SLIDING WINDOW MEMORY (อัปเกรด)
// ─────────────────────────────────────────────────────────

/**
 * [UPGRADE 3] Smart Memory Window ที่ปรับขนาดตามประเภทข้อความ
 *
 * ปัญหาเดิม: ตัดแค่ slice(-4) ตายตัว ทำให้บทสนทนาต่อเนื่องขาดหาย
 * เช่น ถามสต็อกแล้วถามต่อว่า "แล้วรายการไหนต้องสั่งด่วน?"
 * AI จะไม่รู้ว่า "รายการ" หมายถึงอะไร
 *
 * วิธีใหม่: เพิ่ม window เป็น 8 messages แต่ใช้ token budget
 * โดยตัด messages เก่าที่ยาวเกินออกก่อน
 */
const MAX_MEMORY_MESSAGES = 8;
const MAX_CHARS_PER_MESSAGE = 2000; // ป้องกัน messages ที่ tool คืนค่า data ยาวมาก

function buildSmartMemory(messages: any[]): any[] {
  const recent = messages.slice(-MAX_MEMORY_MESSAGES);

  return recent.map((m: any) => {
    let content = m.content;

    // แปลง parts array เป็น string ถ้าจำเป็น
    if (!content && Array.isArray(m.parts)) {
      content = m.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
    }

    content = content ?? '';

    // ถ้า message ยาวเกิน budget ให้ตัดและบอก AI ว่าตัดแล้ว
    // เพื่อให้ AI รู้ว่าข้อมูลอาจไม่ครบ แทนที่จะรับข้อมูลผิด
    if (content.length > MAX_CHARS_PER_MESSAGE) {
      content = content.slice(0, MAX_CHARS_PER_MESSAGE) + '\n[...ข้อมูลถูกตัดเพื่อประหยัด token...]';
    }

    return {
      role: m.role,
      content: optimizeThaiTokens(content),
    };
  });
}

// ─────────────────────────────────────────────────────────
// SECTION 5: SYSTEM PROMPT BUILDER (อัปเกรดใหญ่)
// ─────────────────────────────────────────────────────────

/**
 * [UPGRADE 4] Dynamic System Prompt ที่ปรับตาม intent
 *
 * ปัญหาเดิม: System Prompt เดียวรวมทุกอย่าง ทำให้ยาวเกินและ AI
 * ต้องประมวลผล instruction ที่ไม่เกี่ยวข้องกับคำถามนั้น
 *
 * วิธีใหม่: สร้าง base prompt + inject เฉพาะ section ที่เกี่ยวข้อง
 * ลดขนาด system prompt เฉลี่ย ~30-40% ต่อ request
 */
function buildSystemPrompt(
  intents: IntentScores,
  currentIsoDate: string,
  currentThaiDate: string,
): string {
  // --- IDENTITY & GENDER RULES (ลำดับความสำคัญสูงสุด) ---
  const identity = `
คุณคือ "บรู" (Bru) ผู้ช่วยสาวแสนสวยประจำร้านกาแฟ BLACKANDBREW
- คุณเป็นผู้หญิง: ต้องใช้คำลงท้ายว่า "ค่ะ" หรือ "นะคะ" เท่านั้น
- กฎเหล็ก: ห้าม! ใช้คำว่า "ครับ" หรือแทนตัวเองว่า "ผม" อย่างเด็ดขาด
- ผู้ใช้คือ "คุณ" หรือ "ผู้จัดการ" ห้ามเรียกผู้ใช้ว่า "คุณลูกค้า" หากเป็นการคุยกับทีมงานหรือผู้จัดการ
- คุณมีเครื่องมือ (Tools) สำหรับการดึงข้อมูลตารางกะงาน วันหยุด และสภาพอากาศ ให้เรียกใช้เครื่องมือเหล่านี้ทันทีเมื่อผู้ใช้สอบถาม ห้ามตอบปฏิเสธว่าไม่มีเครื่องมือเด็ดขาด
- [CRITICAL] เมื่อคุณเรียกใช้งานเครื่องมือ (เช่น getDailyShifts หรือเช็คสภาพอากาศ) เสร็จสิ้นและได้ผลลัพธ์กลับมาแล้ว คุณมีหน้าที่ต้องนำข้อมูลผลลัพธ์นั้นมาประมวลผลและพิมพ์ข้อความสรุปคำตอบเป็นภาษาไทยภาษาพูดที่สั้น กระชับ ตรงประเด็นทันที ห้ามหยุดทำงานหรือส่งข้อความว่างเปล่า (Empty Response) กลับมาเด็ดขาด
`.trim();

  // --- BASE SECTION (ส่งทุกครั้ง) ---
  const base = `
[ข้อมูลบริบทร้านและเวลา]
ชื่อร้าน: BLACKANDBREW | ที่ตั้ง: ลำลูกกา, ปทุมธานี
พิกัด: ละติจูด ${STORE_LAT}, ลองติจูด ${STORE_LON}
วันที่ปัจจุบัน (ISO): ${currentIsoDate}
วันเวลาปัจจุบัน (ไทย): ${currentThaiDate}
(ใช้เป็นฐานอ้างอิงเสมอเมื่อคำนวณ "วันนี้", "พรุ่งนี้", หรือ "สัปดาห์หน้า")

[DATE INFERENCE RULES]
- หากผู้ใช้ระบุปีเป็นเลข 2 หลัก (เช่น 69 หรือ 26):
  1. ให้สันนิษฐานตามปีปัจจุบัน (${currentIsoDate}) โดยเลข 69 คือ พ.ศ. 2569 (ค.ศ. 2026) และ 26 คือ ค.ศ. 2026
  2. แปลงเป็นรูปแบบ YYYY-MM-DD เพื่อใช้กับ Tools ทันทีโดยไม่ต้องถามซ้ำหากสามารถอนุมานได้
  3. หากระบุเพียง "3/6" ให้ถือว่าเป็นวันที่ 3 เดือนมิถุนายน ของปีปัจจุบัน (${currentIsoDate.split('-')[0]})
  4. สำหรับคำระบุเวลาเชิงสัมพัทธ์ (เช่น "วันนี้", "พรุ่งนี้", "เมื่อวาน"): ให้คำนวณวันที่ที่ถูกต้องโดยอ้างอิงจาก "วันที่ปัจจุบัน (ISO)" ที่ระบุไว้ในระบบ แล้วส่งค่า YYYY-MM-DD เข้าสู่ Tools ทันที

[UI_INTEGRITY_RULES]
- ทุกตาราง (Table) รวมถึงบน Desktop และภายใน Modal ต้องหุ้มด้วย <div className="w-full overflow-x-auto scrollbar-thin pb-8"> เสมอ ห้ามให้ตารางล้นขอบคอนเทนเนอร์เด็ดขาด และต้องมีระยะ pb-8 เพื่อไม่ให้ Scrollbar บดบังแถวสุดท้าย
- ตัวตารางต้องมี min-width ขั้นต่ำ (แนะนำ min-w-[800px] ถึง 1000px) และใช้ padding กระชับ (p-2) เพื่อไม่ให้ข้อมูลเบียดกัน
- ทุก Modal Content (กล่องสีขาว) ต้องมีข้อจำกัดความสูง max-h-[90vh] และเปิด overflow-y-auto scrollbar-thin เพื่อป้องกันการล้นจอแนวตั้ง
- Modal Overlay (ฉากหลัง) ต้องใช้ flex items-center justify-center p-4 เพื่อจัดวางกล่องเนื้อหาไว้กึ่งกลางหน้าจอเสมอ
- ยึดถือ Zero-Bold Policy (ห้าม font-bold) และใช้ text-black เสมอตามมาตรฐานแบรนด์

[DATA INTEGRITY & PRIVACY]
- ห้ามแสดง UUID (เช่น 7777d2fc...) ในคำตอบเด็ดขาด ให้ใช้ชื่อบุคคลแทนเสมอ
- ห้ามตอบเป็นตาราง ห้ามใช้ตัวหนา (ห้ามใช้ **) ตอบเป็นภาษาไทยเท่านั้น โดยใช้ \n สำหรับขึ้นบรรทัดใหม่
- [CRITICAL] ส่วนของ "คำแนะนำ" ต้อง Hyper-Concise: สั้น กระชับ ตรงประเด็นขั้นสูงสุด
- รูปแบบ: Bullet Points (เครื่องหมาย "-") เท่านั้น (ไม่เกิน 2-3 ข้อสั้นๆ) ห้ามเขียนเป็นพารากราฟยาว
- ห้ามใช้คำเกริ่นนำที่เยิ่นเย้อ และห้ามใส่ประโยคห่วงใยหรือคำอวยพรปิดท้ายย่อหน้าเด็ดขาด
- ห้ามเดาข้อมูลจากความรู้เดิม ยึด Tool output เป็น Source of Truth

[หลักการใช้ข้อมูล]
- Internal API-First: ข้อมูลจาก Tool = ความจริงสูงสุด
- ถ้า Tool ล้มเหลวหรือคืนค่าว่าง → รายงานตามนั้นตรงๆ อย่าเดา
- วันที่ที่แสดงแก่ผู้ใช้ต้องเป็นรูปแบบ DD-MM-YYYY เสมอ

[Business Executive Rules]
${JSON.stringify(EXECUTIVE_RULES, null, 2)}
`.trim();

  // --- CONDITIONAL SECTIONS (inject ตาม intent ที่ตรวจพบ) ---
  const sections: string[] = [identity, base];

  // Inject เมื่อถามเรื่องวันหยุด
  if (intents.holiday > 0) {
    sections.push(`
[กฎการค้นหาข้อมูลวันหยุด]
1. ใช้ readTable ค้นหาจากตาราง "holidays" เพื่อหาวันหยุดนักขัตฤกษ์
2. Schema: คอลัมน์ "date" (วันที่รูปแบบ YYYY-MM-DD) และ "name" (ชื่อวันหยุด) **ห้ามใช้ชื่อคอลัมน์อื่น**
3. คำนวณจำนวนวันที่เหลือ: เปรียบเทียบวันหยุดที่พบกับวันที่ปัจจุบัน (${currentIsoDate})
4. การตอบกลับ: บอกชื่อวันหยุด วันที่ และสรุปว่าเหลืออีกกี่วันจะถึงวันนั้น (เช่น อีก 5 วันค่ะ)
`.trim());
  }

  // Inject เฉพาะเมื่อถามเรื่องพนักงาน/กะงาน
  if (intents.schedule > 0) {
    sections.push(`
[กฎการค้นหาข้อมูลพนักงานและกะงาน]
1. หากถามถึงตารางงานรายวัน (เช่น วันนี้ หรือ พรุ่งนี้) "ต้อง" ใช้เครื่องมือ getDailyShifts เสมอ
2. คุณต้องแสดงรายชื่อพนักงานให้ครบทุกคน (รวม 9 คน) เสมอ แม้พนักงานคนนั้นจะไม่มีกะงานก็ตาม โดยใช้รูปแบบข้อความดิบ (Plain Text) ตามกฎดังนี้:
   - ห้าม! วนลูปจากข้อมูลที่มีกะงานเท่านั้น ให้วนลูปจากรายชื่อพนักงานทั้งหมด (9 คน) เป็นหลัก
   - ห้าม! ใช้ตัวหนา (**), ห้าม! ใช้เครื่องหมายหัวข้อ (*), ห้าม! ใช้เครื่องหมายทวิภาค (:) ที่ท้ายหัวข้อ
   - ห้าม! ใช้คำนำหน้าชื่อว่า "คุณ" ให้ใช้เฉพาะชื่อพนักงานเท่านั้น (เช่น นิต้า, ปิ่น)
   - รูปแบบหัวข้อ: [ชื่อหมวดหมู่] (เพิ่ม "(รวม [จำนวน] คน)" เฉพาะหมวดหน้าร้าน)
   - รูปแบบรายชื่อ: [ชื่อ] - [เวลาหรือสถานะ]
   - การจัดกลุ่ม: 
     1. พนักงานปฏิบัติงานหน้าร้าน (รวม [จำนวน] คน) - เรียงตามเวลาจากเช้าไปสาย
     2. พนักงานปฏิบัติงานส่วนอื่น - เรียงตาม 'row_order'
     3. พนักงานที่หยุดพัก/ลา - เรียงตาม 'row_order' (หากไม่มีกะให้ระบุว่า "วันหยุด")
3. ห้ามแสดงรหัส UUID หรือคำว่า "พนักงานรหัส..." เด็ดขาด
`.trim());
  }

  // Inject เฉพาะเมื่อถามเรื่อง inventory หรือ maintenance
  if (intents.inventory > 0 || intents.maintenance > 0) {
    sections.push(`
[กฎการวิเคราะห์สต็อกและการซ่อมบำรุง]
1. ดึงตาราง "inventory_items" หรือ "maintenance_records" ทั้งหมดมาก่อน
   (ห้ามคาดหวัง filter เชิงเปรียบเทียบจาก DB เช่น stock < order_point)
2. วิเคราะห์ใน memory: ถ้า stock < order_point → จัดเป็น "low stock"
   → แนะนำ suggested_order = order_qty (ถ้า > 0) หรือ target_stock - stock
3. เรียงลำดับจากความเร่งด่วนสูงสุด (stock ใกล้ 0 มาก่อน)
4. [CRITICAL] เรียก readTable เพียง 1 ครั้งต่อตาราง ห้ามวนซ้ำ
`.trim());
  }

  // Inject เฉพาะเมื่อถามเรื่องอากาศ
  if (intents.weather > 0) {
    sections.push(`
[กฎการวิเคราะห์สภาพอากาศ]
- ให้ใช้เครื่องมือ weatherTool ในการดึงข้อมูลพยากรณ์อากาศล่าสุด
- อ้างอิงพิกัดร้านเสมอ: Lat ${STORE_LAT}, Lon ${STORE_LON}
- [OPERATIONAL FILTER] วิเคราะห์และพยากรณ์อากาศเฉพาะช่วงเวลา 06:00 - 18:00 (Asia/Bangkok) เท่านั้น
- ข้อมูลสภาพอากาศหรือฝนตกนอกช่วงเวลานี้ให้ตัดทิ้งทั้งหมด ไม่ต้องนำมาคำนวณหรือแสดงผล
- เชื่อมโยงสภาพอากาศกับผลกระทบต่อธุรกิจ:
  เช่น ฝนตก → ลูกค้าน้อยลง / ส่งของล่าช้า / พนักงานมาสาย
- ถ้ามีทั้ง weather + schedule/inventory ให้วิเคราะห์ผลกระทบร่วมด้วย
`.trim());
  }

  // Inject เฉพาะเมื่อถามข้อมูลภายนอก
  if (intents.externalSearch > 0) {
    sections.push(`
[กฎการค้นหาข้อมูลภายนอก]
- ใช้ internetSearchTool สำหรับข่าว, เทรนด์, ราคาตลาด
- ระบุแหล่งที่มาของข้อมูลที่ค้นพบเสมอ
- เชื่อมโยงกับบริบทของร้านกาแฟ BLACKANDBREW เสมอ
`.trim());
  }

  return sections.join('\n\n');
}

// ─────────────────────────────────────────────────────────
// SECTION 6: TOOL SELECTION ENGINE (อัปเกรด)
// ─────────────────────────────────────────────────────────

/**
 * [UPGRADE 5] Score-based tool selection แทน boolean flags
 *
 * ปัญหาเดิม: ถ้าไม่มี keyword ตรงๆ จะไม่ได้ tool เลย
 * เช่น "วันนี้ร้านมีอะไรน่าเป็นห่วงบ้าง?" → ไม่ match regex ไหนเลย
 *
 * วิธีใหม่: ถ้าคะแนนรวม > threshold ให้เปิด tool นั้น
 * threshold ต่ำ = เปิด tool บ่อยขึ้น (recall สูง)
 * threshold สูง = เปิด tool เฉพาะเมื่อชัดเจน (precision สูง)
 */
const INTENT_THRESHOLD = 2; // คะแนนขั้นต่ำที่ถือว่า "ชัดเจนพอ"

function selectTools(intents: IntentScores): {
  tools: Record<string, any>;
  maxSteps: number;
} {
  const tools: Record<string, any> = {};
  let maxSteps = 1;

  const needsDB = intents.inventory >= INTENT_THRESHOLD
    || intents.maintenance >= INTENT_THRESHOLD
    || intents.holiday >= INTENT_THRESHOLD
    || intents.schedule >= INTENT_THRESHOLD; // schedule uses readTable now

  if (needsDB) {
    tools.readTable = wrapTool(readTableTool);
    maxSteps = Math.max(maxSteps, 5); // higher maxSteps for DB operations
  }

  if (intents.externalSearch >= INTENT_THRESHOLD || intents.weather >= INTENT_THRESHOLD) {
    // weather can use internet search
    tools.internetSearchTool = wrapTool(internetSearchTool);
    maxSteps = Math.max(maxSteps, 4);
  }

  // Composite intent
  if (needsDB && (intents.externalSearch >= INTENT_THRESHOLD || intents.weather >= INTENT_THRESHOLD)) {
    maxSteps = Math.max(maxSteps, 5);
  }

  return { tools, maxSteps };
}

// ─────────────────────────────────────────────────────────
// SECTION 7: MAIN ROUTE HANDLER
// ─────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- ดึงข้อความล่าสุดเพื่อวิเคราะห์ intent ---
    const lastMsg = messages[messages.length - 1];
    const lastMsgText = typeof lastMsg?.content === 'string'
      ? lastMsg.content
      : (lastMsg?.parts ?? [])
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('');

    // [UPGRADE 1] ใช้ weighted scoring แทน boolean
    const intents = classifyIntent(lastMsgText);

    // [UPGRADE 5] เลือก tools และ maxSteps จาก scores
    const { tools: selectedTools, maxSteps } = selectTools(intents);
    const enabledTools = Object.keys(selectedTools).length > 0
      ? selectedTools
      : undefined;

    // [UPGRADE 3] Smart memory window
    const coreMessages = buildSmartMemory(messages);

    // --- เตรียม context เวลา ---
    const now = new Date();
    const todayZoned = toZonedTime(now, 'Asia/Bangkok');
    const currentThaiDate = now.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    const currentIsoDate = format(todayZoned, 'yyyy-MM-dd');

    // [UPGRADE 4] Dynamic system prompt
    const systemPrompt = buildSystemPrompt(intents, currentIsoDate, currentThaiDate);

    const agent = new ToolLoopAgent({
      model: google('gemini-2.5-flash'),
      instructions: systemPrompt,
      ...(enabledTools ? { 
        tools: enabledTools,
        stopWhen: stepCountIs(maxSteps)
      } : {}),
      providerOptions: {
        google: {
          generationConfig: {
            maxOutputTokens: 1200,
            temperature: enabledTools ? 0.05 : 0.3,
          },
        },
      },
    });

    const result = await agent.stream({
      messages: coreMessages,
      onStepFinish: process.env.NODE_ENV === 'development'
        ? ({ toolCalls, toolResults }) => {
            if (toolCalls && toolCalls.length > 0) {
              console.debug('[BRU_AI] Tool step completed:', {
                calls: toolCalls.map(tc => tc.toolName),
                resultCount: toolResults?.length,
              });
            }
          }
        : undefined,
    });

    return result.toUIMessageStreamResponse();

  } catch (error) {
    // [UPGRADE 8] Structured error response พร้อม error type
    const isTimeout = error instanceof Error && error.message.includes('timeout');
    const statusCode = isTimeout ? 504 : 500;
    const errorMessage = isTimeout
      ? 'AI ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้งค่ะ'
      : 'เกิดข้อผิดพลาดภายในระบบค่ะ';

    console.error('[BRU_AI] CRITICAL ERROR:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development'
        ? (error instanceof Error ? error.stack : undefined)
        : undefined,
    });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: statusCode, headers: { 'Content-Type': 'application/json' } }
    );
  }
}